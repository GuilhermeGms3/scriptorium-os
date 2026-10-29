import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";

import { applyWorkspaceMigrations } from "../../../scripts/database/workspace-migrate";
import type {
  WorkspaceDatabase,
  WorkspaceRow,
  WorkspaceSqlValue,
} from "../workspace-runtime/workspace-database";
import { PrivateDocumentRepository } from "../repositories/private-document-repository";
import { PipelineAuditRepository } from "../repositories/pipeline-audit-repository";
import { prepareInferenceReviewBatches } from "./local-knowledge-pipeline-service";

const KEY = "configuration";
const databases: DatabaseSync[] = [];

afterEach(() => {
  while (databases.length) databases.pop()?.close();
});

/** An in-memory workspace; `failOnTransaction` makes that transaction (1-based) throw. */
function adapter(db: DatabaseSync, failOnTransaction?: number): WorkspaceDatabase {
  let transactions = 0;
  return {
    persistence: "memory",
    async query(sql: string, bind: WorkspaceSqlValue[] = []): Promise<WorkspaceRow[]> {
      return db.prepare(sql).all(...bind) as WorkspaceRow[];
    },
    async execute(sql: string, bind: WorkspaceSqlValue[] = []): Promise<void> {
      db.prepare(sql).run(...bind);
    },
    async transaction(statements): Promise<void> {
      transactions += 1;
      if (transactions === failOnTransaction) throw new Error("A aba foi fechada.");
      db.exec("BEGIN IMMEDIATE");
      try {
        for (const statement of statements)
          db.prepare(statement.sql).run(...(statement.bind ?? []));
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
    async reset(): Promise<void> {},
  };
}

/** A book whose `count` units each have one inferred link the pipeline withheld for review. */
async function bookWithInferredLinks(count: number) {
  const db = new DatabaseSync(":memory:");
  databases.push(db);
  applyWorkspaceMigrations(db);
  const { document } = await PrivateDocumentRepository.importDocument(
    {
      title: "Comentário",
      language: "pt-BR",
      originalName: "comentario.pdf",
      mimeType: "application/pdf",
      sizeBytes: 512,
      checksum: "c".repeat(64),
      pageCount: 1,
      textPageCount: 1,
      extractionMethod: "pdf-text-layer",
      pages: [{ pageIndex: 0, pageLabel: "1", text: "Texto.", itemCount: 1 }],
    },
    "opfs:/comentario.pdf",
    adapter(db),
  );
  const now = "2026-10-16T00:00:00.000Z";
  for (let index = 0; index < count; index += 1) {
    const unit = `unit:${String(index).padStart(4, "0")}`;
    db.prepare(
      "INSERT INTO semantic_units(id,document_id,unit_kind,ordinal,text_checksum,language,method) VALUES(?,?,'paragraph',?,?,'pt-BR','test')",
    ).run(unit, document.id, index, String(index).padStart(64, "0"));
    db.prepare(
      `INSERT INTO knowledge_proposals(id,document_id,semantic_unit_id,proposal_kind,payload_json,method,confidence,review_status,created_at,updated_at)
       VALUES(?,?,?,'passage-relation','{}','local-llm:test:1',0,'machine-proposed',?,?)`,
    ).run(`proposal:${unit}`, document.id, unit, now, now);
    db.prepare(
      "INSERT INTO pipeline_decisions(proposal_id,publication,origin,evidence_json,configuration_key,updated_at) VALUES(?,'withheld','inferred','{}',?,?)",
    ).run(`proposal:${unit}`, KEY, now);
  }
  return { db, documentId: document.id };
}

const batches = (db: DatabaseSync) =>
  db
    .prepare("SELECT ordinal,member_count,status FROM pipeline_review_batches ORDER BY ordinal")
    .all();

describe("review batches of inferred links", () => {
  it("batches only what an interrupted run left out, after the batches already there", async () => {
    const { db, documentId } = await bookWithInferredLinks(250);
    await expect(prepareInferenceReviewBatches(adapter(db, 2), documentId, KEY)).rejects.toThrow(
      "A aba foi fechada.",
    );
    expect(batches(db)).toHaveLength(1);

    await prepareInferenceReviewBatches(adapter(db), documentId, KEY);
    expect(batches(db)).toEqual([
      { ordinal: 0, member_count: 100, status: "pending" },
      { ordinal: 1, member_count: 100, status: "pending" },
      { ordinal: 2, member_count: 50, status: "pending" },
    ]);
    expect(
      db
        .prepare(
          "SELECT count(*) AS n, count(DISTINCT proposal_id) AS distinct_n FROM pipeline_review_batch_members",
        )
        .get(),
    ).toEqual({ n: 250, distinct_n: 250 });

    await prepareInferenceReviewBatches(adapter(db), documentId, KEY);
    expect(batches(db)).toHaveLength(3);
  });

  it("releases a batch once every sample is confirmed, and rejects it on one rejected sample", async () => {
    const { db, documentId } = await bookWithInferredLinks(200);
    const workspace = adapter(db);
    await prepareInferenceReviewBatches(workspace, documentId, KEY);
    const samples = (ordinal: number) =>
      db
        .prepare(
          `SELECT m.proposal_id FROM pipeline_review_batch_members m
           JOIN pipeline_review_batches b ON b.id=m.batch_id
           WHERE b.ordinal=? AND m.is_sample=1 ORDER BY m.proposal_id`,
        )
        .all(ordinal)
        .map((row) => String(row["proposal_id"]));
    const visible = (ordinal: number) =>
      db
        .prepare(
          `SELECT count(*) AS n FROM pipeline_decisions d
           JOIN pipeline_review_batch_members m ON m.proposal_id=d.proposal_id
           JOIN pipeline_review_batches b ON b.id=m.batch_id
           WHERE b.ordinal=? AND d.publication='machine-visible'`,
        )
        .get(ordinal);

    const first = samples(0);
    await PipelineAuditRepository.review(first.slice(0, -1), "confirmed", workspace);
    expect(batches(db)[0]).toMatchObject({ status: "pending" });
    await PipelineAuditRepository.review(first.slice(-1), "confirmed", workspace);
    expect(batches(db)[0]).toMatchObject({ status: "released" });
    expect(visible(0)).toEqual({ n: 100 });

    await PipelineAuditRepository.review(samples(1).slice(0, 1), "rejected", workspace);
    expect(batches(db)[1]).toMatchObject({ status: "rejected" });
    expect(visible(1)).toEqual({ n: 0 });
  });
});
