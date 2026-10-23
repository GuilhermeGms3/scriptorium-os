import { describe, it, expect } from "vitest";
import { greekDictionaryEntries, normalizeHeadword } from "./private-lexical-entry";
import { structuredStudyText } from "./structured-study-text";
describe("private lexical and study structure", () => {
  it("matches Greek diacritics without conflating transliteration or taking body mentions as entries", () => {
    const text =
      "λόγος, ου, ὁ palavra e discurso.\nUma menção a θεός não é cabeçalho.\nλόγχη, ης, ἡ lança.\nλοιπός, ή, όν restante.";
    const entries = greekDictionaryEntries(text);
    expect(entries[0]?.lemma).toBe("λόγος");
    expect(text.slice(entries[0]!.start, entries[0]!.end)).toContain("discurso");
    expect(text.slice(entries[0]!.start, entries[0]!.end)).not.toContain("lança");
    expect(entries.some((e) => e.lemma === "θεός")).toBe(false);
    expect(entries.some((e) => e.lemma === "λοιπός")).toBe(false); // unknown continuation at page end
    expect(normalizeHeadword("λόγος")).toBe(normalizeHeadword("λόγος"));
    expect(normalizeHeadword("logos")).not.toBe(normalizeHeadword("λόγος"));
  });
  it("distinguishes objection, contrary and solution; never changes the original", () => {
    const text =
      "Questão 1: tema\nArt. 1 — pergunta\nO primeiro discute-se assim. — Parece que não.\nMas, em contrário, diz o texto.\nSOLUÇÃO. — Resposta do autor.\nDONDE A RESPOSTA À PRIMEIRA OBJEÇÃO. — Distinção.";
    const sections = structuredStudyText(
      "private-document:bce9882610a0564144fdd1fb2ced480a1c25a30db48b4cbb004958d16034fbed",
      text,
    );
    expect(sections.map((s) => s.role)).toEqual([
      "question",
      "article",
      "objections",
      "counterargument",
      "answer",
      "reply",
    ]);
    expect(sections.map((s) => text.slice(s.start, s.end)).join("")).toBe(text);
    expect(structuredStudyText("private-document:other", text)).toEqual([]);
  });
  it("stops before period headings and verb entries, preserving internal mentions", () => {
    const text =
      "λόγος, ου, ό palavra\nUma menção a θεός na prosa.\nλόγχη. ης. η lança\nλοιδορέω  injuriar\nλοιδορία, ας, η injúria";
    const entries = greekDictionaryEntries(text);
    expect(text.slice(entries[0]!.start, entries[0]!.end)).not.toContain("lança");
    expect(text.slice(entries[1]!.start, entries[1]!.end)).not.toContain("injuriar");
  });
});
