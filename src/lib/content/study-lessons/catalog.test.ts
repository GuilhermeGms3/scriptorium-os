import { describe, expect, it } from "vitest";
import { PORTUGUESE_KNOWLEDGE_LABELS } from "../knowledge-presentation";
import { STUDY_GUIDES } from "../study-guides";
import { lessonForTopic, LESSON_REFERENCES, TOPIC_PRIMERS } from "./catalog";
import { TOPIC_DEEPENING } from "./deepening";
import { DEEPENING_PASSAGES } from "./deepening-passages";
import { BIBLIA_LIVRE_BOOKS } from "../../corpus-config/biblia-livre";

describe("Conteúdo educacional dos temas", () => {
  it("liga os casos bíblicos a livros reais e intervalos explícitos", () => {
    const books = new Set<string>(Object.values(BIBLIA_LIVRE_BOOKS).map((book) => book[0]));
    for (const [id, passages] of Object.entries(DEEPENING_PASSAGES)) {
      expect(TOPIC_PRIMERS[id], id).toBeDefined();
      for (const passage of passages) {
        expect(books.has(passage.ref.bookId), passage.label).toBe(true);
        expect(passage.ref.chapter).toBeGreaterThan(0);
        expect(passage.ref.verseStart).toBeGreaterThan(0);
        expect(passage.ref.verseEnd).toBeGreaterThanOrEqual(passage.ref.verseStart!);
      }
    }
  });
  it("aprofunda cada entidade com análise, caso e síntese específicos", () => {
    expect(Object.keys(TOPIC_DEEPENING).sort()).toEqual(Object.keys(TOPIC_PRIMERS).sort());
    for (const [id, title] of Object.entries(PORTUGUESE_KNOWLEDGE_LABELS)) {
      const deeper = lessonForTopic({ id, title })!.chapters[0]!.deepening!;
      expect(deeper, id).toBeDefined();
      expect(deeper.analysis).not.toBe(deeper.caseStudy);
      expect(deeper.caseStudy).not.toBe(deeper.reflection);
    }
    expect(TOPIC_DEEPENING["doctrine:trinity"]).not.toEqual(
      TOPIC_DEEPENING["doctrine:incarnation"],
    );
    expect(TOPIC_DEEPENING["method:textual-criticism"]).not.toEqual(
      TOPIC_DEEPENING["method:source-criticism"],
    );
  });
  it("inclui os sete concílios sem substituir a abertura temática e distingue história medieval", () => {
    const history = lessonForTopic({
      id: "study-guide:historia-tradicoes",
      title: "História e tradições",
    })!;
    for (const title of [
      "Niceia I — 325",
      "Constantinopla I — 381",
      "Éfeso — 431",
      "Calcedônia — 451",
      "Constantinopla II — 553",
      "Constantinopla III — 680–681",
      "Niceia II — 787",
    ]) {
      expect(
        history.chapters.some((chapter) => chapter.title === title),
        title,
      ).toBe(true);
    }
    const patristics = lessonForTopic({ id: "study-guide:patristica", title: "Patrística" })!;
    expect(patristics.chapters.some((chapter) => /cruzadas|cátaros/iu.test(chapter.title))).toBe(
      false,
    );
  });
  it("abre com explicação própria para cada entidade conhecida, sem emprestar o título de outro tema", () => {
    for (const [id, title] of Object.entries(PORTUGUESE_KNOWLEDGE_LABELS)) {
      const lesson = lessonForTopic({ id, title });
      expect(lesson, id).not.toBeNull();
      expect(lesson!.chapters[0]!.id).toBe(`overview:${id}`);
      expect(lesson!.chapters[0]!.title).toBe(title);
      expect(lesson!.chapters[0]!.paragraphs).toEqual(TOPIC_PRIMERS[id]!.paragraphs);
      expect(lesson!.chapters.length, id).toBeGreaterThan(1);
    }
  });
  it("oferece leitura em todos os percursos e referências identificáveis por capítulo", () => {
    const references = new Set(LESSON_REFERENCES.map((item) => item.id));
    expect(references.size).toBe(LESSON_REFERENCES.length);
    for (const reference of LESSON_REFERENCES) {
      expect(new URL(reference.url).protocol).toBe("https:");
      expect(reference.perspective).not.toBe("");
    }
    const topics = [
      ...Object.entries(PORTUGUESE_KNOWLEDGE_LABELS).map(([id, title]) => ({ id, title })),
      ...STUDY_GUIDES.map((guide) => ({ id: `study-guide:${guide.id}`, title: guide.title })),
    ];
    for (const topic of topics) {
      const lesson = lessonForTopic(topic)!;
      expect(lesson, topic.id).not.toBeNull();
      expect(new Set(lesson.chapters.map((item) => item.id)).size).toBe(lesson.chapters.length);
      for (const item of lesson.chapters) {
        expect(item.paragraphs.length, `${topic.id}:${item.id}`).toBeGreaterThanOrEqual(2);
        for (const id of item.references) expect(references.has(id), id).toBe(true);
      }
    }
  });
  it("distingue assuntos próximos e não inventa conteúdo para um novo tema do usuário", () => {
    const trinity = lessonForTopic({ id: "doctrine:trinity", title: "Trindade" })!;
    const incarnation = lessonForTopic({ id: "doctrine:incarnation", title: "Encarnação" })!;
    expect(trinity.chapters[0]!.paragraphs).not.toEqual(incarnation.chapters[0]!.paragraphs);
    expect(lessonForTopic({ id: "user:novo-assunto", title: "Meu assunto" })).toBeNull();
  });
});
