import { z } from "zod";
import type { Edition, TextUnit } from "../domain/scripture";
import type { CorpusSearchHit, CorpusSearchQuery } from "../corpus-runtime/contracts";
import {
  getWorkspaceDatabase,
  type WorkspaceDatabase,
} from "../workspace-runtime/workspace-database";

export const PrivateVerseSchema = z.object({
  id: z.string().min(10).max(200),
  editionId: z.string().startsWith("private:"),
  documentChecksum: z.string().regex(/^[a-f0-9]{64}$/),
  sequence: z.number().int().nonnegative(),
  bookId: z.string().regex(/^[a-z0-9-]+$/),
  chapter: z.number().int().positive(),
  verse: z.number().int().positive(),
  sourceScheme: z.string().min(3),
  text: z.string().min(1).max(12000),
  mapping: z.object({
    targetScheme: z.literal("scriptorium-bcv-1"),
    method: z.literal("explicit-heading-and-complete-chapter"),
    review: z.literal("machine-proposed"),
  }),
  fragments: z
    .array(
      z.object({
        physicalPage: z.number().int().positive(),
        startOffset: z.number().int().nonnegative(),
        endOffset: z.number().int().positive(),
        quote: z.string().min(1).max(12000),
      }),
    )
    .min(1)
    .max(128),
});
let installed: Edition[] = [];
export const PrivateScriptureRepository = {
  cachedEditions: () => installed,
  async search(query: CorpusSearchQuery, database?: WorkspaceDatabase): Promise<CorpusSearchHit[]> {
    if (
      (!database && typeof window === "undefined") ||
      query.lemma ||
      query.morphology ||
      (query.language && !query.language.startsWith("pt"))
    )
      return [];
    const tokens = query.text.match(/[\p{L}\p{N}]+/gu)?.slice(0, 12);
    if (!tokens?.length) return [];
    const db = database ?? (await getWorkspaceDatabase());
    const editions = query.editionIds?.filter((id) => id.startsWith("private:")).slice(0, 100);
    if (query.editionIds?.length && !editions?.length) return [];
    const clause = editions?.length
      ? ` AND u.edition_id IN (${editions.map(() => "?").join(",")})`
      : "";
    const rows = await db.query(
      `SELECT u.*,snippet(private_scripture_fts,0,'','',' … ',24) snippet,bm25(private_scripture_fts) rank FROM private_scripture_fts JOIN private_scripture_units u ON u.rowid=private_scripture_fts.rowid WHERE private_scripture_fts MATCH ?${clause} ORDER BY rank LIMIT ?`,
      [
        tokens.map((t) => '"' + t + '"').join(" AND "),
        ...(editions ?? []),
        Math.min(100, Math.max(1, query.limit ?? 30)),
      ],
    );
    return rows.map((r) => ({
      rank: -Number(r["rank"]),
      snippet: String(r["snippet"]),
      matchKind: "full-text" as const,
      textUnit: {
        id: String(r["id"]),
        corpusId: "private-scripture",
        editionId: String(r["edition_id"]),
        workId: "work:" + String(r["book_id"]),
        sequence: Number(r["sequence"]),
        unitType: "verse",
        text: String(r["text"]),
        language: "pt-BR",
        address: {
          workId: "work:" + String(r["book_id"]),
          bookId: String(r["book_id"]),
          chapter: Number(r["chapter"]),
          verseStart: Number(r["verse"]),
          versificationSchemeId: "scriptorium-bcv-1",
        },
        provenance: {
          acquisition: "user-provided",
          creationMethod: "machine-assisted",
          note: "Edição privada extraída do PDF, correspondência estrutural em revisão.",
        },
      },
    }));
  },
  async listEditions(database?: WorkspaceDatabase): Promise<Edition[]> {
    if (!database && typeof window === "undefined") return [];
    const db = database ?? (await getWorkspaceDatabase());
    const rows = await db.query(
      "SELECT e.* FROM private_scripture_editions e WHERE EXISTS(SELECT 1 FROM private_scripture_units u WHERE u.edition_id=e.id) ORDER BY e.title",
    );
    installed = rows.map((r) => ({
      id: String(r["id"]),
      corpusId: "private-scripture",
      title: String(r["title"]),
      abbreviation: String(r["abbreviation"]),
      language: String(r["language"]),
      kind: "translation" as const,
      script: "Latn",
      direction: "ltr" as const,
      licenseId: "private-user-provided",
    }));
    return installed;
  },
  async chapter(
    bookId: string,
    chapter: number,
    database?: WorkspaceDatabase,
  ): Promise<TextUnit[]> {
    if (!database && typeof window === "undefined") return [];
    const db = database ?? (await getWorkspaceDatabase());
    await this.listEditions(db);
    const rows = await db.query(
      "SELECT id,edition_id,book_id,chapter,verse,text FROM private_scripture_units WHERE book_id=? AND chapter=? ORDER BY edition_id,verse",
      [bookId, chapter],
    );
    return rows.map((r) => ({
      id: String(r["id"]),
      editionId: String(r["edition_id"]),
      text: String(r["text"]),
      ref: {
        workId: `work:${bookId}`,
        bookId,
        chapter,
        verseStart: Number(r["verse"]),
        versificationSchemeId: "scriptorium-bcv-1",
      },
    }));
  },
};
