import { describe, expect, it } from "vitest";
import { PORTUGUESE_KNOWLEDGE_LABELS } from "../knowledge-presentation";
import { STUDY_GUIDES } from "../study-guides";
import { lessonForTopic, LESSON_REFERENCES, TOPIC_PRIMERS } from "./catalog";

describe("Conteúdo educacional dos temas", () => {
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
