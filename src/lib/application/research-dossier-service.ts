import { ScriptureKnowledgeEngine } from "../knowledge-engine/scripture-knowledge-engine";
import { ScriptureRepository } from "../repositories/scripture-repository";
import { WorkspacePassageKnowledgeService } from "./workspace-passage-knowledge-service";
import type { PassageRef, TokenOccurrence } from "../domain/scripture";
import type { WordKnowledgeBundle } from "../domain/knowledge-bundle";
import { parseBiblicalReferences } from "../semantic-engine/biblical-reference-parser";

export function normalizedResearchTerm(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[’'\s/־-]/gu, "");
}
export function bereshitQuery(text: string): boolean {
  return ["bereshit", "bereishit", "bereshith", "beresit", "בראשית"].includes(
    normalizedResearchTerm(text),
  );
}
export function researchTarget(query: string): { ref: PassageRef; word?: string } | null {
  if (bereshitQuery(query))
    return {
      ref: {
        bookId: "genesis",
        chapter: 1,
        verseStart: 1,
        verseEnd: 1,
        versificationSchemeId: "scriptorium-bcv-1",
      },
      word: "בראשית",
    };
  const parts = query.split("@");
  const parsed = parseBiblicalReferences(
    parts.length > 1 ? parts.slice(1).join("@").trim() : query,
  )[0];
  const ref: PassageRef | null = parsed
    ? {
        bookId: parsed.bookId,
        chapter: parsed.chapter,
        versificationSchemeId: parsed.versificationSchemeId,
        ...(parsed.verseStart ? { verseStart: parsed.verseStart } : {}),
        ...(parsed.verseEnd ? { verseEnd: parsed.verseEnd } : {}),
      }
    : null;
  if (!ref) return null;
  return {
    ref,
    ...(parts.length > 1
      ? { word: bereshitQuery(parts[0]!.trim()) ? "בראשית" : parts[0]!.trim() }
      : {}),
  };
}
export async function loadResearchDossier(query: string, chosen?: PassageRef, tokenId?: string) {
  const parsed = researchTarget(query);
  const ref = chosen ?? parsed?.ref;
  if (!ref) {
    const hits = await ScriptureRepository.search({ text: query, limit: 8 });
    return { kind: "choices" as const, hits };
  }
  const bundle = await ScriptureKnowledgeEngine.loadPassageKnowledgeBundle(ref);
  if (!bundle) throw new Error("Passagem não encontrada nas edições disponíveis.");
  const privateResult = await Promise.allSettled([
    WorkspacePassageKnowledgeService.load(ref, bundle),
  ]);
  const originals = bundle.originals.status === "available" ? bundle.originals.data : [];
  const words = parsed?.word ? [normalizedResearchTerm(parsed.word)] : [];
  const token: TokenOccurrence | undefined = tokenId
    ? originals.find((item) => item.id === tokenId)
    : words.length
      ? originals.find((item) =>
          [item.surface, item.lemma, item.transliteration].some(
            (value) => value && words.includes(normalizedResearchTerm(value)),
          ),
        )
      : undefined;
  let word: WordKnowledgeBundle | null = null;
  let wordError = false;
  if (token) {
    try {
      word = await ScriptureKnowledgeEngine.getWordKnowledgeBundle(token);
    } catch {
      wordError = true;
    }
  }
  return {
    kind: "dossier" as const,
    bundle,
    ref,
    originals,
    word,
    wordError,
    privateLayer: privateResult[0]?.status === "fulfilled" ? privateResult[0].value : null,
    privateUnavailable: privateResult[0]?.status === "rejected",
  };
}
