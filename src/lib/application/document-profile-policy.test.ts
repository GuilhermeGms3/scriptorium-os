import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";

import { applyWorkspaceMigrations } from "../../../scripts/database/workspace-migrate";
import type { KnowledgeProposal, KnowledgeProposalPayload } from "../domain/document-knowledge";
import type { DocumentProfileKind } from "../domain/document-profile";
import {
  knowledgeItemCoversVerse,
  passageKnowledgeGroup,
  PASSAGE_KNOWLEDGE_GROUP_LABELS,
  type WorkspacePassageKnowledgeItem,
} from "../domain/workspace-passage-knowledge";
import { DocumentKnowledgeRepository } from "../repositories/document-knowledge-repository";
import { DocumentProcessingRepository } from "../repositories/document-processing-repository";
import { PrivateDocumentRepository } from "../repositories/private-document-repository";
import type {
  WorkspaceDatabase,
  WorkspaceRow,
  WorkspaceSqlValue,
} from "../workspace-runtime/workspace-database";
import { DocumentKnowledgePipelineService } from "./document-knowledge-pipeline-service";
import { isBiblicalTextUnit, profileAllowsVerseInference } from "./document-profile-policy";
import { explicitPublicationForProfile } from "./local-knowledge-pipeline-service";

const databases: DatabaseSync[] = [];

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

type PassageRelation = KnowledgeProposal & {
  payload: Extract<KnowledgeProposalPayload, { kind: "passage-relation" }>;
};

/** Imports a one-page synthetic book, sets its profile as the researcher would, and analyzes it. */
async function relationsAs(profile: DocumentProfileKind, text: string): Promise<PassageRelation[]> {
  const db = new DatabaseSync(":memory:");
  databases.push(db);
  applyWorkspaceMigrations(db);
  const workspace = adapter(db);
  const { document } = await PrivateDocumentRepository.importDocument(
    {
      title: "Livro sintético",
      language: "pt-BR",
      originalName: "sintetico.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
      checksum: "f".repeat(64),
      pageCount: 1,
      textPageCount: 1,
      extractionMethod: "pdf-text-layer",
      pages: [{ pageIndex: 0, pageLabel: "1", text, itemCount: 20 }],
    },
    "opfs:/sintetico.pdf",
    workspace,
  );
  await DocumentProcessingRepository.correctProfile(document.id, profile, workspace);
  await DocumentKnowledgePipelineService.analyzeDocument(document.id, undefined, workspace);
  const proposals = await DocumentKnowledgeRepository.listProposals(
    document.id,
    { limit: 2_000 },
    workspace,
  );
  return proposals.filter(
    (proposal): proposal is PassageRelation => proposal.payload.kind === "passage-relation",
  );
}

/** Raw references in a stable order: the repository lists proposals by id, not by position. */
const references = (relations: readonly PassageRelation[]) =>
  relations.map((relation) => relation.payload.rawReference).sort();

function itemFor(relation: PassageRelation): WorkspacePassageKnowledgeItem {
  return {
    id: relation.id,
    reviewState: "pending",
    document: { id: relation.documentId, sourceId: "source", title: "Livro sintético" },
    unit: {
      id: relation.semanticUnitId,
      documentId: relation.documentId,
      kind: "paragraph",
      ordinal: 0,
      textChecksum: "0".repeat(64),
      language: "pt-BR",
      method: "test",
      spans: [
        {
          unitId: relation.semanticUnitId,
          pageId: "page",
          pageIndex: 0,
          ordinal: 0,
          startOffset: 0,
          endOffset: 1,
        },
      ],
      text: "",
    },
    passageRelation: relation,
    proposals: [relation],
    translation: null,
    pages: [0],
    context: {
      authors: [],
      attributions: [],
      citations: [],
      methods: [],
      perspectiveProfileIds: [],
    },
  };
}

describe("study Bibles and interlinears: no links from the biblical text itself", () => {
  const studyPage = [
    "João 3,16 Porque Deus amou o mundo de tal maneira que deu o seu Filho único. 17 Pois Deus não enviou o seu Filho ao mundo para condenar o mundo.",
    "3,16 Cf. Rm 5,8; 1Jo 4,9-10. O amor do Pai é a fonte da missão do Filho.",
    "Rm 5,8; 1Jo 4,9",
  ].join("\n\n");

  it.each(["study-bible", "interlinear"] as const)(
    "%s keeps notes and marginal references only",
    async (profile) => {
      expect(references(await relationsAs(profile, studyPage))).toEqual(
        ["Rm 5,8", "1Jo 4,9-10", "Rm 5,8", "1Jo 4,9"].sort(),
      );
    },
  );

  it("the same page read as a monograph still links its opening reference", async () => {
    expect(references(await relationsAs("academic-monograph", studyPage))).toContain("João 3,16");
  });

  it.each([
    ["16 Porque Deus amou o mundo de tal maneira.", true],
    ["JOÃO 3 16 Porque Deus amou o mundo.", true],
    ["Jo 3:16 οὕτως γὰρ ἠγάπησεν ὁ θεὸς τὸν κόσμον. 17 οὐ γὰρ ἀπέστειλεν ὁ θεὸς", true],
    ["3,16 Cf. Rm 5,8. O amor do Pai.", false],
    ["Rm 5,8; 1Jo 4,9", false],
    ["1Jo 4,9 é citado aqui.", false],
    ["O amor de Deus em Jo 3,16 é central.", false],
  ])("isBiblicalTextUnit(%s) is %s", (text, expected) => {
    expect(isBiblicalTextUnit(text, "pt-BR")).toBe(expected);
  });
});

describe("dictionaries, lexicons and encyclopedias: lexical mentions", () => {
  const entry = "AMOR (gr. agape). Termo central do NT; cf. Jo 3:16; Rm 5:8; 1Co 13:4-7; 1Jo 4:8.";

  it.each(["dictionary", "lexicon", "encyclopedia"] as const)(
    "%s marks every reference as a lexical mention, never under a verse",
    async (profile) => {
      const relations = await relationsAs(profile, entry);
      expect(references(relations)).toEqual(["Jo 3:16", "Rm 5:8", "1Co 13:4-7", "1Jo 4:8"].sort());
      for (const relation of relations) {
        expect(relation.payload.referenceRole).toBe("lexical-mention");
        const item = itemFor(relation);
        const { bookId, chapter, verseStart } = relation.payload.passage;
        expect(knowledgeItemCoversVerse(item, bookId, chapter!, verseStart!)).toBe(false);
        expect(PASSAGE_KNOWLEDGE_GROUP_LABELS[passageKnowledgeGroup(item)]).toBe(
          "Dicionários e léxicos",
        );
      }
    },
  );

  it("is never published automatically, whatever the profile", () => {
    expect(explicitPublicationForProfile("commentary", true, true, "body", "lexical-mention")).toBe(
      "exception",
    );
  });
});

describe("Nag Hammadi and ancient primary sources: intertextual links", () => {
  const logion =
    "Logion 1. E ele disse: Quem encontrar a interpretação destas palavras não provará a morte. Compare Jo 8:52.";

  it.each(["nag-hammadi-anthology", "ancient-primary-source"] as const)(
    "%s marks references as intertextual and groups them as primary sources",
    async (profile) => {
      const [relation, ...rest] = await relationsAs(profile, logion);
      expect(rest).toEqual([]);
      expect(relation?.payload).toMatchObject({
        rawReference: "Jo 8:52",
        referenceRole: "intertextual",
      });
      const item = itemFor(relation!);
      expect(PASSAGE_KNOWLEDGE_GROUP_LABELS[passageKnowledgeGroup(item)]).toBe("Fontes primárias");
      expect(explicitPublicationForProfile(profile, true, true, "body", "intertextual")).toBe(
        "exception",
      );
      expect(profileAllowsVerseInference(profile)).toBe(false);
    },
  );

  it("still lets a commentary infer the verse of a paragraph", () => {
    expect(profileAllowsVerseInference("commentary")).toBe(true);
  });
});

describe("confessions and catechisms: proof texts", () => {
  const article = [
    "CAPÍTULO I",
    "I. Ainda que a luz da natureza e as obras da criação manifestem a bondade de Deus (Rm 2.14-15; Sl 19.1-3), não são suficientes para dar aquele conhecimento de Deus.",
    "Assim ensina também Jo 17:3 sobre o conhecimento de Deus como vida eterna.",
  ].join("\n\n");

  it.each(["confession", "catechism"] as const)(
    "%s treats parenthesized references as proof texts with high confidence",
    async (profile) => {
      const relations = await relationsAs(profile, article);
      const byReference = new Map(relations.map((item) => [item.payload.rawReference, item]));
      for (const reference of ["Rm 2.14-15", "Sl 19.1-3"]) {
        expect(byReference.get(reference)?.payload.referenceRole).toBe("proof-text");
        expect(byReference.get(reference)!.confidence).toBeGreaterThanOrEqual(0.95);
      }
      expect(byReference.get("Jo 17:3")?.payload).not.toHaveProperty("referenceRole");
    },
  );

  it("still needs confirmation unless the numbering of the source is confirmed", () => {
    expect(explicitPublicationForProfile("confession", false, false, "body", "proof-text")).toBe(
      "exception",
    );
    expect(explicitPublicationForProfile("confession", true, true, "body", "proof-text")).toBe(
      "machine-visible",
    );
  });
});
