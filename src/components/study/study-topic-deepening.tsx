import { useId, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { DeepStudy } from "../../lib/content/study-lessons/deepening-types";
import type { LessonPassage } from "../../lib/content/study-lessons/deepening-passages";
import { Button } from "../ui/button";

const blocks = [
  { key: "analysis", title: "Análise" },
  { key: "caseStudy", title: "Caso de leitura" },
  { key: "reflection", title: "Minha síntese" },
] as const;

export function StudyTopicDeepening({
  content,
  passages,
}: {
  content: DeepStudy;
  passages?: readonly LessonPassage[];
}) {
  const [selected, setSelected] = useState(0);
  const id = useId();
  const block = blocks[selected]!;
  return (
    <section className="topic-deepening" aria-label="Aprofundar este conteúdo">
      <p className="meta-label">Aprofundar este conteúdo</p>
      <div className="topic-deepening-choices" role="group" aria-label="Contexto do aprofundamento">
        {blocks.map((item, index) => (
          <Button
            key={item.key}
            variant={index === selected ? "secondary" : "ghost"}
            aria-pressed={index === selected}
            aria-controls={id}
            onClick={() => setSelected(index)}
          >
            {item.title}
          </Button>
        ))}
      </div>
      <div id={id} className="topic-deepening-text" aria-live="polite">
        <h3>{block.title}</h3>
        <p>{content[block.key]}</p>
        {selected === 1 &&
          passages?.map((passage) => (
            <Link
              key={passage.label}
              to="/scripture/$book/$chapter"
              params={{ book: passage.ref.bookId, chapter: String(passage.ref.chapter) }}
              search={passage.ref.verseStart ? { v: passage.ref.verseStart } : {}}
              className="mt-4 mr-4 inline-flex text-sm text-primary underline"
            >
              Ler {passage.label} →
            </Link>
          ))}
      </div>
    </section>
  );
}
