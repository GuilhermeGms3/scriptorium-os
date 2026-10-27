import type { KnowledgeClaim } from "../../lib/domain/knowledge";
import type { SourceFragment, SourceReference } from "../../lib/domain/source";
import type { VerseContent } from "../../lib/domain/scripture";
import type { VerseMark } from "../../lib/domain/verse-marks";
import {
  knowledgeItemCoversVerse,
  type WorkspacePassageKnowledgeItem,
} from "../../lib/domain/workspace-passage-knowledge";
import { passageLinkLabel } from "../../lib/application/workspace-passage-knowledge-service";
import { claimKindLabel, reviewStatusLabel } from "../../lib/i18n";
import {
  belongsInChapterOverview,
  commentaryProvenance,
  contextualCommentary,
} from "../scripture/commentary-presentation";

export interface PrintComment {
  id: string;
  /** Where it comes from: "Comentário de Orígenes · p. 12". */
  source: string;
  /** The stretch it speaks of when wider than one verse: "vv. 3–5". */
  passage?: string;
  text: string;
  /** What it is and how it was linked, as under the comment on screen. */
  provenance: string;
}

export interface ChapterPrintVerse {
  verse: number;
  /** Null when the edition has no text for this verse. */
  text: string | null;
  startsParagraph: boolean;
  comments: PrintComment[];
  /** The reader's highlighter color and star for this verse. */
  mark?: Pick<VerseMark, "color" | "favorite">;
}

export interface ChapterPrintModel {
  /** Notes on the whole chapter or a long stretch of it, printed once before the text. */
  overview: PrintComment[];
  verses: ChapterPrintVerse[];
}

/** Editorial notes that describe the text itself stay on screen; paper carries the commentary. */
const TEXTUAL_CLAIMS = new Set([
  "textual-observation",
  "linguistic-analysis",
  "textual-critical-analysis",
]);

/**
 * The original words as written: the "/" that marks Hebrew prefixes in the source is dropped, and a
 * word joined by a maqaf (־) to the next one is printed without a space after it.
 */
function originalText(verse: VerseContent): string | null {
  if (!verse.original?.length) return null;
  return verse.original
    .map((token, index, tokens) => {
      const word = `${token.prefix ?? ""}${token.surface.replaceAll("/", "")}${token.suffix ?? ""}`;
      return index === tokens.length - 1 || word.endsWith("־") ? word : `${word} `;
    })
    .join("");
}

function libraryComment(item: WorkspacePassageKnowledgeItem, passage?: string): PrintComment {
  const analysis = item.passageRelation.payload.contextualAnalysis;
  return {
    id: item.id,
    source: `${item.document.title} · p. ${item.pages.map((page) => page + 1).join(", ")}`,
    ...(passage ? { passage } : {}),
    text: analysis?.summary ?? item.translation?.translatedText ?? item.unit.text,
    provenance: commentaryProvenance(item),
  };
}

function verseSpan(item: WorkspacePassageKnowledgeItem): string | undefined {
  const { verseStart, verseEnd } = item.passageRelation.payload.passage;
  return verseStart !== undefined && verseEnd !== undefined && verseEnd > verseStart
    ? `vv. ${verseStart}–${verseEnd}`
    : undefined;
}

/**
 * What a chapter printout carries, following the reader's choices (edition, sources turned off,
 * subject and reading context already applied to `libraryItems`). Unlike the screen, a library
 * note covering several verses prints once, under the first of them, instead of under each.
 */
export function chapterPrintModel({
  bookId,
  chapter,
  verses,
  editionId,
  original,
  includeComments,
  claims,
  sources,
  libraryItems,
  hiddenSources,
  domain,
  markOf,
}: {
  bookId: string;
  chapter: number;
  verses: readonly VerseContent[];
  editionId: string;
  /** Print the original-language words instead of the translation. */
  original: boolean;
  includeComments: boolean;
  claims: readonly KnowledgeClaim[];
  sources?: { references: SourceReference[]; fragments: SourceFragment[] };
  libraryItems: readonly WorkspacePassageKnowledgeItem[];
  hiddenSources: ReadonlySet<string>;
  domain: string;
  /** The reader's marks, printed as on screen. */
  markOf?: (verse: number) => Pick<VerseMark, "color" | "favorite"> | undefined;
}): ChapterPrintModel {
  const visible = includeComments
    ? libraryItems.filter(
        (item) =>
          !hiddenSources.has(item.document.id) &&
          (!domain ||
            item.proposals.some(
              (proposal) =>
                proposal.payload.kind === "topic-assignment" && proposal.payload.domain === domain,
            )),
      )
    : [];
  const overviewItems = contextualCommentary(
    visible.filter((item) => belongsInChapterOverview(item, true, bookId, chapter)),
  );
  const inOverview = new Set(overviewItems.map((item) => item.id));
  const libraryByVerse = new Map<number, PrintComment[]>();
  for (const item of contextualCommentary(visible.filter((item) => !inOverview.has(item.id)))) {
    const first = verses.find((verse) =>
      knowledgeItemCoversVerse(item, bookId, chapter, verse.verse),
    );
    if (!first) continue;
    const span = verseSpan(item);
    libraryByVerse.set(first.verse, [
      ...(libraryByVerse.get(first.verse) ?? []),
      libraryComment(item, span),
    ]);
  }

  const beginsAt = (claim: KnowledgeClaim, verse: number) =>
    claim.anchors.some(
      (anchor) =>
        anchor.type === "passage" &&
        anchor.ref.bookId === bookId &&
        anchor.ref.chapter === chapter &&
        (anchor.ref.verseStart ?? 1) === verse,
    );
  const editorial = (verse: number): PrintComment[] =>
    includeComments
      ? claims
          .filter((claim) => !TEXTUAL_CLAIMS.has(claim.kind) && beginsAt(claim, verse))
          .map((claim) => {
            const cited = (sources?.fragments ?? [])
              .filter((fragment) => claim.sourceFragmentIds.includes(fragment.id))
              .map((fragment) => {
                const reference = sources?.references.find(
                  (candidate) => candidate.id === fragment.sourceId,
                );
                return reference?.work
                  ? `${reference.work} · ${fragment.locator}`
                  : fragment.locator;
              });
            return {
              id: claim.id,
              source: cited.length ? cited.join("; ") : "Estudo da passagem",
              text: claim.proposition,
              provenance: `${claimKindLabel(claim.kind)} · ${reviewStatusLabel(claim.reviewStatus)}`,
            };
          })
      : [];

  return {
    overview: overviewItems.map((item) =>
      libraryComment(item, passageLinkLabel(item.passageRelation.payload.passage)),
    ),
    verses: verses.map((verse) => ({
      ...(markOf?.(verse.verse) ? { mark: markOf(verse.verse)! } : {}),
      verse: verse.verse,
      text: original ? originalText(verse) : (verse.translations[editionId] ?? null),
      startsParagraph: Boolean(verse.startsParagraph),
      comments: [...editorial(verse.verse), ...(libraryByVerse.get(verse.verse) ?? [])],
    })),
  };
}
