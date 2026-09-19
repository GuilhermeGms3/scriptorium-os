/** Canonical knowledge graph backed by the same SQLite package as theology and arguments. */
import type {
  EntityType,
  KnowledgeClaim,
  KnowledgeEntity,
  KnowledgeRelation,
  TextAnchor,
} from "../domain/knowledge";
import type { PassageRef } from "../domain/scripture";
import { passageRefsOverlap } from "../domain/scripture";
import type { SourceFragment, SourceReference } from "../domain/source";
import type { PassageAnalysis } from "../domain/analysis";
import { toSafeFtsQuery } from "../corpus-runtime/search-normalization";
import {
  getKnowledgeDatabase,
  knowledgeOptionalText as optional,
  knowledgeQuery as query,
  knowledgeText as text,
  type KnowledgeRow,
} from "./knowledge-database";

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  person: "Person",
  place: "Place",
  event: "Event",
  passage: "Passage",
  work: "Work",
  concept: "Concept",
  word: "Word",
  manuscript: "Manuscript",
  "historical-source": "Historical Source",
};

export interface KnowledgeSearchHit {
  kind:
    | "knowledge-entity"
    | "theological-topic"
    | "doctrine"
    | "tradition"
    | "school"
    | "method"
    | "epistemic-stance"
    | "interpretive-framework"
    | "position"
    | "theory"
    | "claim"
    | "argument"
    | "lexeme";
  id: string;
  label: string;
  detail?: string;
  rank: number;
}

function mapEntity(row: KnowledgeRow): KnowledgeEntity {
  const metadata = JSON.parse(text(row, "metadata_json")) as Partial<KnowledgeEntity>;
  const description = optional(row, "description");
  return {
    id: text(row, "id"),
    type: text(row, "entity_type") as EntityType,
    name: text(row, "canonical_name"),
    ...(typeof metadata.originalForm === "string" ? { originalForm: metadata.originalForm } : {}),
    ...(description ? { description } : {}),
  };
}

async function mapClaim(row: KnowledgeRow): Promise<KnowledgeClaim> {
  const database = await getKnowledgeDatabase();
  const id = text(row, "id");
  const anchors = query(
    database,
    "SELECT anchor_json FROM claim_anchors WHERE claim_id=? ORDER BY ordinal",
    [id],
  ).map((item) => JSON.parse(text(item, "anchor_json")) as TextAnchor);
  const sourceIds = query(database, "SELECT source_id FROM claim_sources WHERE claim_id=?", [
    id,
  ]).map((item) => text(item, "source_id"));
  const assessmentNote = optional(row, "assessment_note");
  return {
    id,
    proposition: text(row, "proposition"),
    kind: text(row, "claim_type") as KnowledgeClaim["kind"],
    anchors,
    evidence: [],
    sourceFragmentIds: sourceIds.map((sourceId) => `fragment:knowledge:${id}:${sourceId}`),
    origin: text(row, "origin") as KnowledgeClaim["origin"],
    reviewStatus: text(row, "review_status") as KnowledgeClaim["reviewStatus"],
    supportLevel: text(row, "support_level") as KnowledgeClaim["supportLevel"],
    ...(assessmentNote ? { assessmentNote } : {}),
  };
}

function mapSource(row: KnowledgeRow): SourceReference {
  const metadata = JSON.parse(text(row, "metadata_json")) as Record<string, unknown>;
  const provenance = (metadata["provenance"] ?? {
    acquisition: "imported",
    creationMethod: "human",
  }) as SourceReference["provenance"];
  const rights = metadata["rights"] as
    { license?: string; redistribution?: string; attribution?: string } | undefined;
  const rawType = text(row, "source_type");
  const sourceType: NonNullable<SourceReference["sourceType"]> =
    rawType === "edition" || rawType === "book" || rawType === "article" || rawType === "document"
      ? rawType
      : rawType.includes("dataset")
        ? "dataset"
        : "document";
  const locator = optional(row, "locator");
  return {
    id: text(row, "id"),
    work: text(row, "title"),
    ...(locator ? { url: locator } : {}),
    sourceType,
    ...(rights?.license
      ? {
          license: {
            name: rights.license,
            redistributionAllowed:
              rights.redistribution === "allowed" ||
              rights.redistribution === "allowed-with-attribution",
            ...(rights.attribution ? { attribution: rights.attribution } : {}),
          },
        }
      : {}),
    provenance,
  };
}

function fragmentSourceClassification(
  row: KnowledgeRow,
): Pick<SourceFragment, "sourceType" | "epistemicRole"> {
  const sourceType = text(row, "source_type");
  if (sourceType === "primary-source-edition" || sourceType === "scripture-edition") {
    return { sourceType: "primary-text", epistemicRole: "primary" };
  }
  return { sourceType: "secondary-work", epistemicRole: "secondary" };
}

async function allRelations(): Promise<KnowledgeRelation[]> {
  const database = await getKnowledgeDatabase();
  return query(database, "SELECT * FROM knowledge_relations ORDER BY id").map((row) => {
    const id = text(row, "id");
    const sourceIds = query(
      database,
      "SELECT source_id FROM knowledge_relation_sources WHERE relation_id=?",
      [id],
    ).map((item) => text(item, "source_id"));
    const description = optional(row, "description");
    return {
      id,
      from: JSON.parse(text(row, "from_anchor_json")) as TextAnchor,
      to: JSON.parse(text(row, "to_anchor_json")) as TextAnchor,
      relation: { kind: "custom", value: text(row, "relation_type") },
      ...(description ? { description } : {}),
      evidence: [],
      sourceFragmentIds: sourceIds.map((sourceId) => `fragment:knowledge:${id}:${sourceId}`),
      reviewStatus: text(row, "review_status") as KnowledgeRelation["reviewStatus"],
      provenance: JSON.parse(text(row, "provenance_json")) as KnowledgeRelation["provenance"],
    };
  });
}

export const KnowledgeRepository = {
  async listEntities(type?: EntityType): Promise<KnowledgeEntity[]> {
    return query(
      await getKnowledgeDatabase(),
      `SELECT * FROM knowledge_entities${type ? " WHERE entity_type=?" : ""} ORDER BY canonical_name`,
      type ? [type] : [],
    ).map(mapEntity);
  },
  async getEntity(id: string): Promise<KnowledgeEntity | null> {
    const row = query(await getKnowledgeDatabase(), "SELECT * FROM knowledge_entities WHERE id=?", [
      id,
    ])[0];
    return row ? mapEntity(row) : null;
  },
  async relationsOf(entityId: string): Promise<KnowledgeRelation[]> {
    return (await allRelations()).filter(
      (relation) =>
        (relation.from.type === "entity" && relation.from.entityId === entityId) ||
        (relation.to.type === "entity" && relation.to.entityId === entityId),
    );
  },
  async relationsForPassage(ref: PassageRef): Promise<KnowledgeRelation[]> {
    return (await allRelations()).filter(
      (relation) =>
        (relation.from.type === "passage" && passageRefsOverlap(relation.from.ref, ref)) ||
        (relation.to.type === "passage" && passageRefsOverlap(relation.to.ref, ref)),
    );
  },
  allRelations,
  async listClaims(): Promise<KnowledgeClaim[]> {
    return Promise.all(
      query(await getKnowledgeDatabase(), "SELECT * FROM claims ORDER BY proposition").map(
        mapClaim,
      ),
    );
  },
  async claimsForEntity(entityId: string): Promise<KnowledgeClaim[]> {
    return (await this.listClaims()).filter((claim) =>
      claim.anchors.some((anchor) => anchor.type === "entity" && anchor.entityId === entityId),
    );
  },
  async claimsForPassage(ref: PassageRef): Promise<KnowledgeClaim[]> {
    return (await this.listClaims()).filter((claim) =>
      claim.anchors.some(
        (anchor) =>
          (anchor.type === "passage" && passageRefsOverlap(anchor.ref, ref)) ||
          (anchor.type === "canonical-text" &&
            anchor.anchor.passage?.bookId !== undefined &&
            anchor.anchor.passage.chapter !== undefined &&
            passageRefsOverlap(
              {
                workId: anchor.anchor.passage.workId,
                bookId: anchor.anchor.passage.bookId,
                chapter: anchor.anchor.passage.chapter,
                ...(anchor.anchor.passage.verseStart !== undefined
                  ? { verseStart: anchor.anchor.passage.verseStart }
                  : {}),
                ...(anchor.anchor.passage.verseEnd !== undefined
                  ? { verseEnd: anchor.anchor.passage.verseEnd }
                  : {}),
                versificationSchemeId: anchor.anchor.passage.versificationSchemeId,
              },
              ref,
            )),
      ),
    );
  },
  async analysesForPassage(ref: PassageRef): Promise<PassageAnalysis[]> {
    const database = await getKnowledgeDatabase();
    return query(database, "SELECT * FROM passage_analyses ORDER BY lens_id,id").flatMap((row) => {
      const anchor = JSON.parse(text(row, "anchor_json")) as TextAnchor;
      if (anchor.type !== "passage" || !passageRefsOverlap(anchor.ref, ref)) return [];
      const id = text(row, "id");
      const sourceIds = query(
        database,
        "SELECT source_id FROM passage_analysis_sources WHERE analysis_id=? ORDER BY source_id",
        [id],
      ).map((source) => text(source, "source_id"));
      const summary = optional(row, "summary");
      const authorNote = optional(row, "author_note");
      return [
        {
          id,
          anchor,
          lensId: text(row, "lens_id") as PassageAnalysis["lensId"],
          title: text(row, "title"),
          ...(summary ? { summary } : {}),
          status: text(row, "analysis_status") as PassageAnalysis["status"],
          reviewStatus: text(row, "review_status") as PassageAnalysis["reviewStatus"],
          interpretationKind: text(
            row,
            "interpretation_kind",
          ) as PassageAnalysis["interpretationKind"],
          sourceFragmentIds: sourceIds.map((sourceId) => `fragment:analysis:${id}:${sourceId}`),
          ...(authorNote ? { authorNote } : {}),
        },
      ];
    });
  },
  async sourcesForClaims(
    claimIds: string[],
  ): Promise<{ references: SourceReference[]; fragments: SourceFragment[] }> {
    if (!claimIds.length) return { references: [], fragments: [] };
    const database = await getKnowledgeDatabase();
    const placeholders = claimIds.map(() => "?").join(",");
    const rows = query(
      database,
      `SELECT cs.claim_id,s.* FROM claim_sources cs JOIN sources s ON s.id=cs.source_id WHERE cs.claim_id IN (${placeholders})`,
      claimIds,
    );
    const references = [
      ...new Map(
        rows.map((row) => {
          const source = mapSource(row);
          return [source.id, source] as const;
        }),
      ).values(),
    ];
    const fragments = rows.map((row): SourceFragment => {
      const source = mapSource(row);
      return {
        id: `fragment:knowledge:${text(row, "claim_id")}:${source.id}`,
        sourceId: source.id,
        locator: optional(row, "locator") ?? source.work,
        ...fragmentSourceClassification(row),
        provenance: source.provenance,
      };
    });
    return { references, fragments };
  },
  async sourcesForRelations(
    relationIds: string[],
  ): Promise<{ references: SourceReference[]; fragments: SourceFragment[] }> {
    if (!relationIds.length) return { references: [], fragments: [] };
    const database = await getKnowledgeDatabase();
    const placeholders = relationIds.map(() => "?").join(",");
    const rows = query(
      database,
      `SELECT rs.relation_id,s.* FROM knowledge_relation_sources rs JOIN sources s ON s.id=rs.source_id WHERE rs.relation_id IN (${placeholders})`,
      relationIds,
    );
    const references = [
      ...new Map(
        rows.map((row) => {
          const source = mapSource(row);
          return [source.id, source] as const;
        }),
      ).values(),
    ];
    const fragments = rows.map((row): SourceFragment => {
      const source = mapSource(row);
      return {
        id: `fragment:knowledge:${text(row, "relation_id")}:${source.id}`,
        sourceId: source.id,
        locator: optional(row, "locator") ?? source.work,
        ...fragmentSourceClassification(row),
        provenance: source.provenance,
      };
    });
    return { references, fragments };
  },
  async sourcesForAnalyses(
    analysisIds: string[],
  ): Promise<{ references: SourceReference[]; fragments: SourceFragment[] }> {
    if (!analysisIds.length) return { references: [], fragments: [] };
    const database = await getKnowledgeDatabase();
    const placeholders = analysisIds.map(() => "?").join(",");
    const rows = query(
      database,
      `SELECT pas.analysis_id,s.* FROM passage_analysis_sources pas JOIN sources s ON s.id=pas.source_id WHERE pas.analysis_id IN (${placeholders})`,
      analysisIds,
    );
    const references = [
      ...new Map(
        rows.map((row) => {
          const source = mapSource(row);
          return [source.id, source] as const;
        }),
      ).values(),
    ];
    const fragments = rows.map((row): SourceFragment => {
      const source = mapSource(row);
      return {
        id: `fragment:analysis:${text(row, "analysis_id")}:${source.id}`,
        sourceId: source.id,
        locator: optional(row, "locator") ?? source.work,
        ...fragmentSourceClassification(row),
        provenance: source.provenance,
      };
    });
    return { references, fragments };
  },
  async search(searchText: string, limit = 30): Promise<KnowledgeSearchHit[]> {
    const normalized = toSafeFtsQuery(searchText);
    if (!normalized) return [];
    return query(
      await getKnowledgeDatabase(),
      "SELECT record_kind,record_id,title,body,bm25(knowledge_fts) rank FROM knowledge_fts WHERE knowledge_fts MATCH ? ORDER BY rank LIMIT ?",
      [normalized, limit],
    ).map((row) => {
      const detail = optional(row, "body");
      return {
        kind: text(row, "record_kind") as KnowledgeSearchHit["kind"],
        id: text(row, "record_id"),
        label: text(row, "title"),
        ...(detail ? { detail } : {}),
        rank: Number(row["rank"] ?? 0),
      };
    });
  },
};
