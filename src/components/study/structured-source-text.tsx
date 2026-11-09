import { structuredStudyText, STUDY_TEXT_LABELS } from "../../lib/domain/structured-study-text";
import type { StudySource } from "../../lib/domain/study-notebook";
import { useSourceReader } from "./source-reader-context";
export function StructuredSourceText({ source, text }: { source: StudySource; text: string }) {
  const open = useSourceReader();
  const sections =
    source.kind === "private-document" ? structuredStudyText(source.documentId, text) : [];
  if (!sections.length)
    return <blockquote className="topic-reading-excerpt topic-original-text">{text}</blockquote>;
  return (
    <section className="my-5 flex flex-col gap-4" aria-label="Estrutura argumentativa da leitura">
      <p className="text-xs text-muted-foreground">
        Seções reconhecidas nesta página. Não substituem a leitura do artigo completo nem inferem
        ligações doutrinárias.
      </p>
      {sections.map((section) => (
        <article className="border-l-2 border-primary/30 pl-4" key={section.start}>
          <h4 className="meta-label">{STUDY_TEXT_LABELS[section.role]}</h4>
          <p className="mt-2 whitespace-pre-wrap font-serif leading-relaxed">
            {text.slice(section.start, section.end)}
          </p>
          {section.end - section.start <= 20000 && (
            <button
              className="mt-2 text-xs underline"
              onClick={() =>
                open({
                  source: {
                    ...source,
                    ...(source.kind === "private-document" ? { unitId: undefined } : {}),
                    ...(source.kind !== "bibliographic"
                      ? {
                          selection: {
                            start: section.start,
                            end: section.end,
                            quote: text.slice(section.start, section.end),
                          },
                        }
                      : {}),
                  },
                })
              }
            >
              Anotar esta seção com a fonte
            </button>
          )}
        </article>
      ))}
    </section>
  );
}
