import { PrivateDocumentRepository as Documents } from "../repositories/private-document-repository";
import { greekDictionaryEntries, normalizeHeadword } from "../domain/private-lexical-entry";
import { PRIVATE_LEXICAL_LOCATORS } from "../content/private-lexical-locators";
import { sha256Hex } from "../workspace-runtime/secure-context";
import type { WorkspaceDatabase } from "../workspace-runtime/protocol";
export const PRIVATE_LEXICON_SOURCES = [
  { checksum: "d061bc0742a1cfa93e6f8023b9e1e7857f430b32d8691f8f3974c9ee85433979", kind: "greek" },
  { checksum: "11e2250828241826b58cb819fd6fdd73ef0c2cbab317c2e81553755a25ec2994", kind: "hebrew" },
  { checksum: "82993d9531639032ee22d5e46eb5960965f7e497354913a83728390739f891c0", kind: "ditat" },
  { checksum: "31405c5c131a310b09abf34b7518de467f211b9307d6e311abd6581fd4229ef7", kind: "ndit" },
  { checksum: "7ba8b5c1824c32d7a8e54f8fbca5c8771df6fc18752f566e7c029b498673647d", kind: "ndit" },
] as const;
export interface PrivateLexicalReading {
  documentId: string;
  title: string;
  page: number;
  lemma: string;
  text: string;
  identified: boolean;
  qualification?: string;
  start?: number;
  end?: number;
}
/** Bounded indexed discovery; an occurrence never becomes an identified entry by fuzzy matching. */
export async function privateLexicalReadings(
  lemmas: readonly string[],
  database?: WorkspaceDatabase,
): Promise<PrivateLexicalReading[]> {
  const terms = [
    ...new Set(lemmas.filter((v) => /[\p{Script=Greek}\p{Script=Hebrew}]/u.test(v))),
  ].slice(0, 3);
  if (!terms.length) return [];
  const groups = await Promise.all(
    PRIVATE_LEXICON_SOURCES.map(async (profile) => {
      const doc = await Documents.findByChecksum(profile.checksum, database);
      if (!doc) return [];
      const hits = (
        await Promise.all(
          terms.map((term) => Documents.search(term, { documentId: doc.id, limit: 2 }, database)),
        )
      ).flat();
      const seen = new Set<number>();
      const result: PrivateLexicalReading[] = [];
      for (const locator of PRIVATE_LEXICAL_LOCATORS) {
        if (
          locator.checksum !== profile.checksum ||
          !terms.some((term) => normalizeHeadword(term) === normalizeHeadword(locator.lemma))
        )
          continue;
        const page = await Documents.getPage(doc.id, locator.page - 1, database);
        if (!page || (await sha256Hex(new TextEncoder().encode(page.text))) !== locator.pageHash)
          continue;
        const start = page.text.indexOf(locator.startMarker);
        const end =
          "endMarker" in locator
            ? page.text.indexOf(locator.endMarker, start + 1)
            : page.text.length;
        if (start < 0 || end <= start) continue;
        seen.add(locator.page - 1);
        result.push({
          documentId: doc.id,
          title: doc.title,
          page: locator.page,
          lemma: locator.lemma,
          text: page.text.slice(start, end),
          start,
          end,
          identified: true,
          qualification: locator.qualification,
        });
      }
      for (const hit of hits) {
        if (seen.has(hit.pageIndex)) continue;
        seen.add(hit.pageIndex);
        const page = await Documents.getPage(doc.id, hit.pageIndex, database);
        if (!page) continue;
        const entries =
          profile.kind === "greek"
            ? greekDictionaryEntries(page.text).filter((entry) =>
                terms.some((term) => normalizeHeadword(term) === normalizeHeadword(entry.lemma)),
              )
            : [];
        if (entries.length) {
          for (const entry of entries)
            result.push({
              documentId: doc.id,
              title: doc.title,
              page: hit.pageIndex + 1,
              lemma: entry.lemma,
              text: page.text.slice(entry.start, entry.end),
              identified: true,
              start: entry.start,
              end: entry.end,
              qualification:
                "Delimitação automática por cabeçalhos desta edição; confira a página original. Não é definição revisada individualmente.",
            });
        } else
          result.push({
            documentId: doc.id,
            title: doc.title,
            page: hit.pageIndex + 1,
            lemma: terms[0] ?? "",
            text: hit.snippet,
            identified: false,
          });
      }
      return result;
    }),
  );
  return groups.flat();
}
