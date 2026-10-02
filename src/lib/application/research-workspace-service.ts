import { z } from "zod";
import { StudyRepository } from "../repositories/study-repository";
import {
  getWorkspaceDatabase,
  type WorkspaceDatabase,
  type WorkspaceRow,
  type WorkspaceSqlValue,
} from "../workspace-runtime/workspace-database";

const scalar = z.union([z.string(), z.number(), z.null()]);
const rows = z.array(z.record(scalar));
const BackupV2Schema = z.object({
  schemaVersion: z.literal(2),
  manifest: z.object({
    backupVersion: z.literal("2.0"),
    createdAt: z.string().datetime(),
    applicationVersion: z.string(),
    databaseSchemaVersion: z.number().int().positive(),
    checksum: z.string().regex(/^[a-f0-9]{64}$/),
  }),
  library: z.object({
    authors: rows,
    authorAliases: rows,
    authorIdentifiers: rows,
    works: rows,
    workAuthors: rows,
    editions: rows,
    editionContributors: rows,
    editionIdentifiers: rows,
    sources: rows,
    sourceAuthors: rows,
    sourceIdentifiers: rows,
    sourceRelations: rows,
    localAssetMetadata: rows,
    collections: rows,
    collectionItems: rows,
    tags: rows,
    tagLinks: rows,
    citations: rows,
    citationRelations: rows,
  }),
  research: z.object({
    studies: rows,
    studyLinks: rows,
    researchQuestions: rows,
    researchQuestionLinks: rows,
    notes: rows,
    noteLinks: rows,
    annotations: rows,
    highlights: rows,
    bookmarks: rows,
  }),
});

const PrivateKnowledgeBackupSchema = z.object({
  documents: rows,
  pageAnchors: rows,
  knowledgeIndexes: rows,
  nodes: rows,
  units: rows,
  spans: rows,
  proposals: rows,
  translations: rows,
  translationJobs: rows,
});

const BackupV3Schema = BackupV2Schema.omit({ schemaVersion: true, manifest: true }).extend({
  schemaVersion: z.literal(3),
  manifest: z.object({
    backupVersion: z.literal("3.0"),
    createdAt: z.string().datetime(),
    applicationVersion: z.string(),
    databaseSchemaVersion: z.number().int().positive(),
    checksum: z.string().regex(/^[a-f0-9]{64}$/),
    privateTextIncluded: z.literal(false),
  }),
  privateKnowledge: PrivateKnowledgeBackupSchema,
});

type BackupV2 = z.infer<typeof BackupV2Schema>;
type BackupV3 = z.infer<typeof BackupV3Schema>;
type BackupRows = Record<string, WorkspaceRow[]>;

function serializableRows(tableRows: WorkspaceRow[]): z.infer<typeof rows> {
  return tableRows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => {
        if (value instanceof Uint8Array)
          throw new Error(
            `A coluna ${key} contém dados binários que não podem entrar no backup JSON.`,
          );
        return [key, value];
      }),
    ),
  );
}

const libraryTables = {
  authors: "authors",
  authorAliases: "author_aliases",
  authorIdentifiers: "author_identifiers",
  works: "works",
  workAuthors: "work_authors",
  editions: "editions",
  editionContributors: "edition_contributors",
  editionIdentifiers: "edition_identifiers",
  sources: "bibliographic_sources",
  sourceAuthors: "source_authors",
  sourceIdentifiers: "source_identifiers",
  sourceRelations: "source_relations",
  localAssetMetadata: "source_assets",
  collections: "library_collections",
  collectionItems: "library_collection_items",
  tags: "tags",
  tagLinks: "tag_links",
  citations: "citations",
  citationRelations: "citation_relations",
} as const;
const researchTables = {
  studies: "studies",
  studyLinks: "study_links",
  researchQuestions: "research_questions",
  researchQuestionLinks: "research_question_links",
  notes: "notes",
  noteLinks: "note_links",
  annotations: "annotations",
  highlights: "highlights",
  bookmarks: "bookmarks",
} as const;

async function sha256(value: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(hash)].map((part) => part.toString(16).padStart(2, "0")).join("");
}

async function exportTables(
  database: WorkspaceDatabase,
  tables: Record<string, string>,
): Promise<BackupRows> {
  const entries = await Promise.all(
    Object.entries(tables).map(
      async ([key, table]) => [key, await database.query(`SELECT * FROM ${table}`)] as const,
    ),
  );
  return Object.fromEntries(entries);
}

function contentForChecksum(backup: Record<string, unknown>): string {
  return JSON.stringify(backup);
}

function insertStatements(
  table: string,
  tableRows: WorkspaceRow[],
): { sql: string; bind: WorkspaceSqlValue[] }[] {
  return tableRows.map((row) => {
    const columns = Object.keys(row);
    if (!columns.length) throw new Error(`Backup row for ${table} has no columns.`);
    if (columns.some((column) => !/^[a-z_]+$/.test(column)))
      throw new Error(`Invalid backup column for ${table}.`);
    return {
      sql: `INSERT OR IGNORE INTO ${table}(${columns.join(",")}) VALUES(${columns.map(() => "?").join(",")})`,
      bind: columns.map((column) => row[column] ?? null),
    };
  });
}

function rebuildFtsStatements(): { sql: string; bind?: WorkspaceSqlValue[] }[] {
  return [
    { sql: "DELETE FROM workspace_fts" },
    {
      sql: "INSERT INTO workspace_fts(entity_kind,entity_id,title,body) SELECT 'source',id,title,coalesce(abstract,'') FROM bibliographic_sources",
    },
    {
      sql: "INSERT INTO workspace_fts(entity_kind,entity_id,title,body) SELECT 'citation',c.id,s.title,coalesce(c.original_text,c.translated_text,c.note,'') FROM citations c JOIN bibliographic_sources s ON s.id=c.source_id",
    },
    {
      sql: "INSERT INTO workspace_fts(entity_kind,entity_id,title,body) SELECT 'note',id,coalesce(title,''),content FROM notes",
    },
    {
      sql: "INSERT INTO workspace_fts(entity_kind,entity_id,title,body) SELECT 'research-question',id,question,coalesce(description,'') FROM research_questions",
    },
  ];
}

async function exportPrivateKnowledge(
  database: WorkspaceDatabase,
): Promise<BackupV3["privateKnowledge"]> {
  const [
    documents,
    pageAnchors,
    knowledgeIndexes,
    nodes,
    units,
    spans,
    proposals,
    translations,
    translationJobs,
  ] = await Promise.all([
    database.query("SELECT * FROM private_documents ORDER BY id"),
    database.query(`SELECT id,document_id,page_index,page_label,'' text,0 character_count,
                             'empty' extraction_method,
                             '{"needsReimport":true}' quality_json
                      FROM private_document_pages ORDER BY document_id,page_index`),
    database.query("SELECT * FROM document_knowledge_indexes ORDER BY document_id"),
    database.query("SELECT * FROM document_nodes ORDER BY document_id,ordinal"),
    database.query("SELECT * FROM semantic_units ORDER BY document_id,ordinal"),
    database.query("SELECT * FROM semantic_unit_spans ORDER BY unit_id,ordinal"),
    database.query("SELECT * FROM knowledge_proposals ORDER BY document_id,id"),
    database.query("SELECT * FROM local_translations ORDER BY source_kind,source_id,id"),
    database.query("SELECT * FROM private_translation_jobs ORDER BY document_id"),
  ]);
  return {
    documents: serializableRows(documents),
    pageAnchors: serializableRows(pageAnchors),
    knowledgeIndexes: serializableRows(knowledgeIndexes),
    nodes: serializableRows(nodes),
    units: serializableRows(units),
    spans: serializableRows(spans),
    proposals: serializableRows(proposals),
    translations: serializableRows(translations),
    translationJobs: serializableRows(translationJobs),
  };
}

const privateKnowledgeTables = {
  documents: "private_documents",
  pageAnchors: "private_document_pages",
  knowledgeIndexes: "document_knowledge_indexes",
  nodes: "document_nodes",
  units: "semantic_units",
  spans: "semantic_unit_spans",
  proposals: "knowledge_proposals",
  translations: "local_translations",
  translationJobs: "private_translation_jobs",
} as const;

async function importV1(
  raw: Record<string, unknown>,
  database: WorkspaceDatabase,
): Promise<{ studies: number; notes: number; researchQuestions: number }> {
  const legacy = z
    .object({
      schemaVersion: z.literal(1),
      studies: z.array(z.record(z.unknown())),
      notes: z.array(z.record(z.unknown())),
      researchQuestions: z.array(z.record(z.unknown())),
    })
    .parse(raw);
  const statements: { sql: string; bind?: WorkspaceSqlValue[] }[] = [];
  for (const study of legacy.studies) {
    if (
      typeof study["id"] !== "string" ||
      typeof study["slug"] !== "string" ||
      typeof study["title"] !== "string"
    )
      continue;
    statements.push({
      sql: "INSERT OR IGNORE INTO studies(id,slug,title,description,status,research_questions_json,created_at,updated_at) VALUES(?,?,?,?,'active','[]',?,?)",
      bind: [
        study["id"],
        study["slug"],
        study["title"],
        typeof study["description"] === "string" ? study["description"] : null,
        String(study["createdAt"]),
        String(study["updatedAt"]),
      ],
    });
  }
  for (const note of legacy.notes) {
    if (typeof note["id"] !== "string") continue;
    statements.push({
      sql: "INSERT OR IGNORE INTO notes(id,title,content,format,created_at,updated_at) VALUES(?,?,?,'markdown',?,?)",
      bind: [
        note["id"],
        typeof note["title"] === "string" ? note["title"] : null,
        String(note["body"] ?? ""),
        String(note["createdAt"]),
        String(note["updatedAt"]),
      ],
    });
  }
  for (const question of legacy.researchQuestions) {
    if (typeof question["id"] !== "string" || typeof question["question"] !== "string") continue;
    statements.push({
      sql: "INSERT OR IGNORE INTO research_questions(id,question,status,description,study_id,provisional_conclusion,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",
      bind: [
        question["id"],
        question["question"],
        typeof question["status"] === "string" ? question["status"] : "open",
        typeof question["description"] === "string" ? question["description"] : null,
        typeof question["studyId"] === "string" ? question["studyId"] : null,
        typeof question["provisionalConclusion"] === "string"
          ? question["provisionalConclusion"]
          : null,
        String(question["createdAt"]),
        String(question["updatedAt"]),
      ],
    });
  }
  await database.transaction([...statements, ...rebuildFtsStatements()]);
  return {
    studies: legacy.studies.length,
    notes: legacy.notes.length,
    researchQuestions: legacy.researchQuestions.length,
  };
}

export const ResearchWorkspaceService = {
  async exportJson(database?: WorkspaceDatabase): Promise<string> {
    const db = database ?? (await getWorkspaceDatabase());
    const [library, research, privateKnowledge, versionRows] = await Promise.all([
      exportTables(db, libraryTables),
      exportTables(db, researchTables),
      exportPrivateKnowledge(db),
      db.query("SELECT max(version) version FROM workspace_migrations"),
    ]);
    const withoutChecksum = {
      schemaVersion: 3 as const,
      manifest: {
        backupVersion: "3.0" as const,
        createdAt: new Date().toISOString(),
        applicationVersion: "0.0.0-phase10.3",
        databaseSchemaVersion: Number(versionRows[0]?.["version"] ?? 0),
        privateTextIncluded: false as const,
      },
      library: library as BackupV3["library"],
      research: research as BackupV3["research"],
      privateKnowledge,
    };
    const backup: BackupV3 = {
      ...withoutChecksum,
      manifest: {
        ...withoutChecksum.manifest,
        checksum: await sha256(contentForChecksum(withoutChecksum)),
      },
    };
    return JSON.stringify(backup, null, 2);
  },

  async importJson(
    raw: string,
    database?: WorkspaceDatabase,
  ): Promise<{ studies: number; notes: number; researchQuestions: number }> {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") throw new Error("Workspace backup is invalid.");
    const db = database ?? (await getWorkspaceDatabase());
    if ((parsed as { schemaVersion?: unknown }).schemaVersion === 1) {
      const result = await importV1(parsed as Record<string, unknown>, db);
      if (!database) await StudyRepository.refresh();
      return result;
    }
    if ((parsed as { schemaVersion?: unknown }).schemaVersion === 2) {
      const backup = BackupV2Schema.parse(parsed);
      const expected = await sha256(
        contentForChecksum({
          schemaVersion: backup.schemaVersion,
          manifest: {
            backupVersion: backup.manifest.backupVersion,
            createdAt: backup.manifest.createdAt,
            applicationVersion: backup.manifest.applicationVersion,
            databaseSchemaVersion: backup.manifest.databaseSchemaVersion,
          },
          library: backup.library,
          research: backup.research,
        }),
      );
      if (expected !== backup.manifest.checksum)
        throw new Error("Workspace backup checksum mismatch.");
      const statements: { sql: string; bind?: WorkspaceSqlValue[] }[] = [];
      for (const [key, table] of Object.entries(libraryTables))
        statements.push(
          ...insertStatements(table, backup.library[key as keyof typeof backup.library]),
        );
      for (const [key, table] of Object.entries(researchTables))
        statements.push(
          ...insertStatements(table, backup.research[key as keyof typeof backup.research]),
        );
      statements.push(...rebuildFtsStatements());
      await db.transaction(statements);
      if (!database) await StudyRepository.refresh();
      return {
        studies: backup.research.studies.length,
        notes: backup.research.notes.length,
        researchQuestions: backup.research.researchQuestions.length,
      };
    }
    const backup = BackupV3Schema.parse(parsed);
    const expected = await sha256(
      contentForChecksum({
        schemaVersion: backup.schemaVersion,
        manifest: {
          backupVersion: backup.manifest.backupVersion,
          createdAt: backup.manifest.createdAt,
          applicationVersion: backup.manifest.applicationVersion,
          databaseSchemaVersion: backup.manifest.databaseSchemaVersion,
          privateTextIncluded: backup.manifest.privateTextIncluded,
        },
        library: backup.library,
        research: backup.research,
        privateKnowledge: backup.privateKnowledge,
      }),
    );
    if (expected !== backup.manifest.checksum)
      throw new Error("Workspace backup checksum mismatch.");
    const statements: { sql: string; bind?: WorkspaceSqlValue[] }[] = [];
    for (const [key, table] of Object.entries(libraryTables))
      statements.push(
        ...insertStatements(table, backup.library[key as keyof typeof backup.library]),
      );
    for (const [key, table] of Object.entries(researchTables))
      statements.push(
        ...insertStatements(table, backup.research[key as keyof typeof backup.research]),
      );
    for (const [key, table] of Object.entries(privateKnowledgeTables))
      statements.push(
        ...insertStatements(
          table,
          backup.privateKnowledge[key as keyof typeof backup.privateKnowledge],
        ),
      );
    statements.push(...rebuildFtsStatements());
    await db.transaction(statements);
    const violations = await db.query("PRAGMA foreign_key_check");
    if (violations.length)
      throw new Error(`Workspace restore produced ${violations.length} foreign-key violations.`);
    if (!database) await StudyRepository.refresh();
    return {
      studies: backup.research.studies.length,
      notes: backup.research.notes.length,
      researchQuestions: backup.research.researchQuestions.length,
    };
  },
};
