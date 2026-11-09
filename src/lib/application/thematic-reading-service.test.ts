import { DatabaseSync } from "node:sqlite";
import { afterEach, expect, it } from "vitest";
import { applyWorkspaceMigrations } from "../../../scripts/database/workspace-migrate";
import { PrivateDocumentRepository } from "../repositories/private-document-repository";
import { thematicReadings } from "../repositories/thematic-reading-repository";
import type { WorkspaceDatabase, WorkspaceRow } from "../workspace-runtime/protocol";
import { sha256Hex } from "../workspace-runtime/secure-context";
import { importThematicReadings } from "./thematic-reading-service";
import { DocumentKnowledgeRepository } from "../repositories/document-knowledge-repository";
import { DocumentKnowledgePipelineService } from "./document-knowledge-pipeline-service";
import { privateLexicalReadings, PRIVATE_LEXICON_SOURCES } from "./private-lexicon-service";

const databases: DatabaseSync[] = [];
afterEach(() => {
  for (const db of databases.splice(0)) db.close();
});
async function fixture(checksum = "d".repeat(64), sourceText?: string) {
  const db = new DatabaseSync(":memory:");
  databases.push(db);
  applyWorkspaceMigrations(db);
  const adapter: WorkspaceDatabase = {
    persistence: "memory",
    query: async (sql, bind = []) => db.prepare(sql).all(...bind) as WorkspaceRow[],
    execute: async (sql, bind = []) => {
      db.prepare(sql).run(...bind);
    },
    transaction: async (statements) => {
      db.exec("BEGIN");
      try {
        for (const s of statements) db.prepare(s.sql).run(...(s.bind ?? []));
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
    reset: async () => {
      throw Error("not allowed");
    },
  };
  const text =
    sourceText ??
    "😀 SOLUÇÃO. Texto inteiramente sintético para conferir a origem, nunca uma citação de livro real.";
  await PrivateDocumentRepository.importDocument(
    {
      title: "Fonte sintética",
      originalName: "fixture.pdf",
      mimeType: "application/pdf",
      sizeBytes: 10,
      checksum,
      language: "pt-BR",
      pageCount: 1,
      textPageCount: 1,
      extractionMethod: "pdf-text-layer",
      pages: [{ pageIndex: 0, pageLabel: "1", text, itemCount: 1 }],
    },
    "opfs:/fixture",
    adapter,
  );
  const entry = {
    domain: "theology",
    context: {
      topicIds: ["study-guide:teologia"],
      locator: "Questão sintética 1",
      sectionPath: ["Parte I", "Questão sintética 1"],
      role: "response",
      author: "Autor sintético",
      tradition: "Perspectiva de teste",
      rationale: "O cabeçalho da seção fornece a associação documental testada.",
      limitations: ["Conteúdo sintético de teste, sem revisão teológica."],
    },
    fragments: [
      {
        physicalPage: 1,
        pageTextChecksum: await sha256Hex(text),
        startOffset: 0,
        endOffset: text.length,
        quote: text,
      },
    ],
  };
  const batch = {
    format: "scriptorium-thematic-readings-v1",
    sourceChecksum: checksum,
    entries: [entry],
  };
  return { db, adapter, batch, text };
}

it("publishes real source units into topic readings, never biblical commentary or accepted claims", async () => {
  const { db, adapter, batch, text } = await fixture();
  expect(await importThematicReadings(JSON.stringify(batch), adapter)).toEqual({
    imported: 1,
    reused: 0,
  });
  const readings = await thematicReadings("study-guide:teologia", adapter);
  expect(readings).toHaveLength(1);
  expect(readings[0]?.locator).toContain("Resposta do autor");
  const row = db.prepare("SELECT * FROM knowledge_proposals").get()!;
  expect(row["review_status"]).toBe("machine-proposed");
  expect(row["proposal_kind"]).toBe("topic-assignment");
  const units = await DocumentKnowledgeRepository.listUnits(
    String(row["document_id"]),
    [String(row["semantic_unit_id"])],
    adapter,
  );
  expect(units[0]?.text).toBe(text);
  expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
});
it("reimports without duplicating or overwriting a human decision", async () => {
  const { db, adapter, batch } = await fixture();
  await importThematicReadings(JSON.stringify(batch), adapter);
  db.exec(
    "UPDATE knowledge_proposals SET review_status='rejected',review_note='Manter decisão humana'",
  );
  expect(await importThematicReadings(JSON.stringify(batch), adapter)).toEqual({
    imported: 0,
    reused: 1,
  });
  expect(await thematicReadings("study-guide:teologia", adapter)).toEqual([]);
  expect(db.prepare("SELECT review_note FROM knowledge_proposals").get()?.["review_note"]).toBe(
    "Manter decisão humana",
  );
});
it("rejects wrong edition, changed page, absent evidence, wrong offsets before writing", async () => {
  const { db, adapter, batch } = await fixture();
  const wrongEdition = { ...batch, sourceChecksum: "a".repeat(64) };
  await expect(importThematicReadings(JSON.stringify(wrongEdition), adapter)).rejects.toThrow(
    "edição",
  );
  for (const patch of [
    { pageTextChecksum: "a".repeat(64) },
    { startOffset: 1 },
    { physicalPage: 2 },
    { quote: "Uma evidência inventada que não consta no original." },
  ]) {
    const changed = structuredClone(batch);
    Object.assign(changed.entries[0]!.fragments[0]!, patch);
    await expect(importThematicReadings(JSON.stringify(changed), adapter)).rejects.toThrow(
      "divergentes",
    );
  }
  expect(db.prepare("SELECT count(*) n FROM semantic_units").get()?.["n"]).toBe(0);
});
it("validates the complete batch before writing and never invents readings for another topic", async () => {
  const { db, adapter, batch } = await fixture();
  const invalid = structuredClone(batch.entries[0]!);
  invalid.fragments[0]!.endOffset++;
  await expect(
    importThematicReadings(
      JSON.stringify({ ...batch, entries: [...batch.entries, invalid] }),
      adapter,
    ),
  ).rejects.toThrow();
  expect(db.prepare("SELECT count(*) n FROM knowledge_proposals").get()?.["n"]).toBe(0);
  await importThematicReadings(JSON.stringify(batch), adapter);
  expect(await thematicReadings("doctrine:unrelated", adapter)).toEqual([]);
});

it("blocks destructive reindexing of thematic sources before deleting evidence", async () => {
  const { db, adapter, batch } = await fixture();
  await importThematicReadings(JSON.stringify(batch), adapter);
  const row = db.prepare("SELECT document_id FROM knowledge_proposals").get()!;
  await expect(
    DocumentKnowledgePipelineService.analyzeDocument(
      String(row["document_id"]),
      undefined,
      adapter,
      { force: true },
    ),
  ).rejects.toThrow();
  expect(db.prepare("SELECT count(*) n FROM knowledge_proposals").get()?.["n"]).toBe(1);
});

it("uses the indexed Greek entry with Portuguese meaning and quarantines changed evidence", async () => {
  const { db, adapter, batch } = await fixture(
    PRIVATE_LEXICON_SOURCES[0].checksum,
    "λόγος, ου, ὁ palavra; exemplo lexical inteiramente sintético para os testes.",
  );
  const entry = batch.entries[0]!;
  entry.context.role = "entry";
  const lexical = {
    ...batch,
    entries: [
      {
        ...entry,
        context: {
          ...entry.context,
          headword: { lemma: "λόγος", normalized: "λογος", language: "grc", extent: "page-local" },
        },
      },
    ],
  };
  await importThematicReadings(JSON.stringify(lexical), adapter);
  const readings = await privateLexicalReadings(["λόγος"], adapter);
  expect(readings[0]).toMatchObject({ identified: true, lemma: "λόγος" });
  expect(readings[0]?.text).toContain("palavra");
  db.exec("UPDATE private_document_pages SET text='Texto alterado sem cabeçalho lexical.'");
  expect((await privateLexicalReadings(["λόγος"], adapter)).some((r) => r.identified)).toBe(false);
});
