import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";

import { applyWorkspaceMigrations } from "../../../scripts/database/workspace-migrate";
import { DocumentKnowledgeRepository } from "../repositories/document-knowledge-repository";
import { LocalTranslationRepository } from "../repositories/local-translation-repository";
import { PrivateDocumentRepository } from "../repositories/private-document-repository";
import type {
  WorkspaceDatabase,
  WorkspaceRow,
  WorkspaceSqlValue,
} from "../workspace-runtime/workspace-database";
import { DocumentKnowledgePipelineService } from "./document-knowledge-pipeline-service";
import { EditorialPromotionService } from "./editorial-promotion-service";
import { ResearchWorkspaceService } from "./research-workspace-service";

const databases: DatabaseSync[] = [];

function database(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  databases.push(db);
  applyWorkspaceMigrations(db);
  return db;
}

function adapter(db: DatabaseSync): WorkspaceDatabase {
  return {
    persistence: "memory",
    async query(sql: string, bind: WorkspaceSqlValue[] = []): Promise<WorkspaceRow[]> {
      return db.prepare(sql).all(...bind) as WorkspaceRow[];
    },
    async execute(sql: string, bind: WorkspaceSqlValue[] = []): Promise<void> {
      db.prepare(sql).run(...bind);
    },
    async transaction(statements): Promise<void> {
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

afterEach(() => {
  while (databases.length) databases.pop()?.close();
});

const PAGE_TEXT =
  "CAPÍTULO 1\n\nNotas sobre Jo 1:1 — a palavra junto do Pai, luz verdadeira, tenda armada entre nós.";
/** Words of the private page that only the pipeline evidence repeats. */
const PRIVATE_QUOTE = "luz verdadeira, tenda armada entre nós";

/** A private book with one accepted link whose pipeline evidence quotes the page. */
async function bookWithQuotedEvidence(db: DatabaseSync, workspace: WorkspaceDatabase) {
  const { document } = await PrivateDocumentRepository.importDocument(
    {
      title: "Notas privadas",
      language: "pt-BR",
      originalName: "notas-privadas.pdf",
      mimeType: "application/pdf",
      sizeBytes: 512,
      checksum: "c".repeat(64),
      pageCount: 1,
      textPageCount: 1,
      extractionMethod: "pdf-text-layer",
      pages: [{ pageIndex: 0, pageLabel: "1", text: PAGE_TEXT, itemCount: 12 }],
    },
    "opfs:/notas-privadas.pdf",
    workspace,
  );
  await DocumentKnowledgePipelineService.analyzeDocument(document.id, undefined, workspace);
  const proposals = await DocumentKnowledgeRepository.listProposals(
    document.id,
    { limit: 100 },
    workspace,
  );
  // The quote must leak only through the evidence, or the test would prove nothing.
  expect(JSON.stringify(proposals)).not.toContain(PRIVATE_QUOTE);
  const relation = proposals.find((proposal) => proposal.payload.kind === "passage-relation")!;
  await DocumentKnowledgeRepository.reviewProposal(relation.id, "accepted", {}, workspace);
  const [unit] = await DocumentKnowledgeRepository.listUnits(
    document.id,
    [relation.semanticUnitId],
    workspace,
  );
  const start = unit!.text.indexOf(PRIVATE_QUOTE);
  const evidence = {
    quote: PRIVATE_QUOTE,
    start,
    end: start + PRIVATE_QUOTE.length,
    textChecksum: unit!.textChecksum,
    decisions: [
      {
        candidateId: "candidate:john-1-1",
        evidenceQuote: PRIVATE_QUOTE,
        evidenceStart: start,
        evidenceEnd: start + PRIVATE_QUOTE.length,
        rationale: `O trecho “${PRIVATE_QUOTE}” ecoa o prólogo.`,
      },
    ],
  };
  db.prepare(
    `INSERT INTO pipeline_decisions(proposal_id,publication,origin,evidence_json,configuration_key,updated_at)
     VALUES(?,'exception','inferred',?,'key',?)`,
  ).run(relation.id, JSON.stringify(evidence), new Date().toISOString());
  db.prepare("INSERT INTO pipeline_unit_receipts VALUES(?,?,'inferred',?,?)").run(
    unit!.id,
    "key",
    JSON.stringify({ unitId: unit!.id, decisions: evidence.decisions }),
    new Date().toISOString(),
  );
  return { document, relation, unit: unit! };
}

describe("workspace backup privacy", () => {
  it("keeps positions and checksums of the evidence but none of its quotes", async () => {
    const db = database();
    const workspace = adapter(db);
    const { relation, unit } = await bookWithQuotedEvidence(db, workspace);

    const backup = await ResearchWorkspaceService.exportJson(workspace);

    expect(backup).not.toContain(PAGE_TEXT);
    expect(backup).not.toContain(PRIVATE_QUOTE);
    const parsed = JSON.parse(backup) as {
      manifest: Record<string, unknown>;
      privateKnowledge: { pipelineDecisions: Record<string, string>[] };
    };
    expect(parsed.manifest).toMatchObject({
      privateTextIncluded: false,
      privateTranslationsIncluded: false,
    });
    const decision = parsed.privateKnowledge.pipelineDecisions.find(
      (row) => row["proposal_id"] === relation.id,
    )!;
    const start = unit.text.indexOf(PRIVATE_QUOTE);
    expect(JSON.parse(decision["evidence_json"]!)).toEqual({
      start,
      end: start + PRIVATE_QUOTE.length,
      textChecksum: unit.textChecksum,
      decisions: [
        {
          candidateId: "candidate:john-1-1",
          evidenceStart: start,
          evidenceEnd: start + PRIVATE_QUOTE.length,
        },
      ],
    });
  });

  it("declares the reviewed private translations it keeps", async () => {
    const db = database();
    const workspace = adapter(db);
    const { unit } = await bookWithQuotedEvidence(db, workspace);
    const now = new Date().toISOString();
    await LocalTranslationRepository.save(
      {
        id: "translation:private-privacy",
        sourceKind: "private-segment",
        sourceId: unit.id,
        sourceLanguage: "pt-BR",
        targetLanguage: "en",
        sourceChecksum: unit.textChecksum,
        translatedText: "Reviewed translation kept on purpose.",
        provider: "fixture-local",
        model: "fixture-pt-en",
        modelRevision: "0123456789abcdef0123456789abcdef01234567",
        reviewStatus: "human-reviewed",
        createdAt: now,
        updatedAt: now,
      },
      workspace,
    );

    const backup = await ResearchWorkspaceService.exportJson(workspace);
    expect(backup).toContain("Reviewed translation kept on purpose.");
    expect(JSON.parse(backup)).toMatchObject({
      manifest: { privateTextIncluded: false, privateTranslationsIncluded: true },
    });
  });

  it("still restores into an empty workspace", async () => {
    const source = database();
    const { document, relation } = await bookWithQuotedEvidence(source, adapter(source));
    const backup = await ResearchWorkspaceService.exportJson(adapter(source));

    const target = database();
    const workspace = adapter(target);
    await ResearchWorkspaceService.importJson(backup, workspace);

    expect(await PrivateDocumentRepository.getDocument(document.id, workspace)).toBeTruthy();
    expect(
      await DocumentKnowledgeRepository.listProposals(
        document.id,
        { reviewStatus: "accepted" },
        workspace,
      ),
    ).toEqual([expect.objectContaining({ id: relation.id })]);
    const restored = target
      .prepare("SELECT evidence_json FROM pipeline_decisions WHERE proposal_id=?")
      .get(relation.id) as { evidence_json: string };
    expect(JSON.parse(restored.evidence_json)).not.toHaveProperty("quote");
    expect(target.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });

  it("finds a research question by its provisional conclusion after a restore", async () => {
    const source = database();
    source
      .prepare(
        "INSERT INTO research_questions(id,question,status,provisional_conclusion,created_at,updated_at) VALUES('question:1','Quem é o Verbo?','provisional','A preexistência do Logos','2026-10-16','2026-10-16')",
      )
      .run();
    const backup = await ResearchWorkspaceService.exportJson(adapter(source));

    const target = database();
    await ResearchWorkspaceService.importJson(backup, adapter(target));
    expect(
      target
        .prepare("SELECT entity_id FROM workspace_fts WHERE workspace_fts MATCH 'preexistência'")
        .all(),
    ).toEqual([{ entity_id: "question:1" }]);
  });
});

describe("editorial staging export privacy", () => {
  it("locates the evidence by page, range and checksum without its text", async () => {
    const db = database();
    const workspace = adapter(db);
    const { document, unit } = await bookWithQuotedEvidence(db, workspace);

    const exported = await EditorialPromotionService.prepare(document.id, workspace);
    const json = JSON.stringify(exported);

    expect(json).not.toContain(PAGE_TEXT);
    expect(json).not.toContain(unit.text);
    expect(json).not.toContain(PRIVATE_QUOTE);
    expect(exported.evidenceUnits).toEqual([
      {
        id: unit.id,
        kind: unit.kind,
        textChecksum: unit.textChecksum,
        locations: unit.spans.map((span) => ({
          page: span.pageIndex + 1,
          startOffset: span.startOffset,
          endOffset: span.endOffset,
        })),
      },
    ]);
  });
});
