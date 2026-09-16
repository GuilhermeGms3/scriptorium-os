import {
  CitationSchema,
  SourceLocatorSchema,
  type Citation,
  type SourceLocator,
} from "../domain/bibliography";
import { CitationNotFoundError, SourceNotFoundError } from "../domain/errors";
import { LibraryRepository } from "../repositories/library-repository";
import { ArgumentRepository } from "../repositories/argument-repository";
import { getWorkspaceDatabase } from "../workspace-runtime/workspace-database";

export interface CreateCitationInput {
  sourceId: string;
  locator?: SourceLocator;
  contentKind: Citation["contentKind"];
  originalText?: string;
  originalLanguage?: string;
  translatedText?: string;
  translator?: string;
  note?: string;
}

export const CitationService = {
  async create(input: CreateCitationInput): Promise<Citation> {
    if (!(await LibraryRepository.getSource(input.sourceId)))
      throw new SourceNotFoundError(`Source ${input.sourceId} was not found.`);
    if (input.locator) SourceLocatorSchema.parse(input.locator);
    const now = new Date().toISOString();
    const citation = CitationSchema.parse({
      id: `citation:${crypto.randomUUID()}`,
      ...input,
      provenance: { origin: "user-workspace", creationMethod: "human" },
      reviewStatus: "draft",
    });
    const db = await getWorkspaceDatabase();
    await db.transaction([
      {
        sql: "INSERT INTO citations(id,source_id,content_kind,locator_json,original_text,original_language,translated_text,translator,note,provenance_json,review_status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
        bind: [
          citation.id,
          citation.sourceId,
          citation.contentKind,
          citation.locator ? JSON.stringify(citation.locator) : null,
          citation.originalText ?? null,
          citation.originalLanguage ?? null,
          citation.translatedText ?? null,
          citation.translator ?? null,
          citation.note ?? null,
          JSON.stringify(citation.provenance),
          citation.reviewStatus,
          now,
          now,
        ],
      },
      {
        sql: "INSERT INTO workspace_fts(entity_kind,entity_id,title,body) VALUES('citation',?,?,?)",
        bind: [
          citation.id,
          citation.locator?.canonicalLocator ?? "Citation",
          citation.originalText ?? citation.translatedText ?? citation.note ?? "",
        ],
      },
    ]);
    return citation;
  },
  async linkToClaim(
    citationId: string,
    claimId: string,
    relationType: "supports" | "challenges" | "qualifies",
  ): Promise<void> {
    const db = await getWorkspaceDatabase();
    if (!(await db.query("SELECT id FROM citations WHERE id=?", [citationId])).length)
      throw new CitationNotFoundError(`Citation ${citationId} was not found.`);
    if (!(await ArgumentRepository.getClaim(claimId)))
      throw new CitationNotFoundError(`Knowledge claim ${claimId} was not found.`);
    await db.execute(
      "INSERT INTO citation_relations(id,citation_id,relation_type,target_kind,target_id) VALUES(?,?,?,?,?)",
      [`citation-relation:${crypto.randomUUID()}`, citationId, relationType, "claim", claimId],
    );
  },
  async format(citation: Citation, style: "basic" | "neutral" = "neutral"): Promise<string> {
    const details = await LibraryRepository.getSourceDetails(citation.sourceId);
    const authors = details.authors.map((author) => author.canonicalName).join(", ");
    const locator =
      citation.locator?.canonicalLocator ??
      [citation.locator?.volume, citation.locator?.pageStart].filter(Boolean).join(":");
    if (style === "basic")
      return [
        authors,
        details.work?.canonicalTitle ?? details.source.title,
        details.edition?.editionStatement,
        details.source.publisher,
        details.source.publicationYear,
        locator,
      ]
        .filter(Boolean)
        .join(", ");
    return [
      authors,
      details.source.title,
      details.source.publicationYear ? `(${details.source.publicationYear})` : undefined,
      locator,
    ]
      .filter(Boolean)
      .join(". ");
  },
};
