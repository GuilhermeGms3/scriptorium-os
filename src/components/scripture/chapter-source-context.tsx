import { useState } from "react";
import { passageReadingSource } from "../../lib/application/reading-source";
import { useSourceReader } from "../study/source-reader-context";
import type { WorkspacePassageKnowledgeItem } from "../../lib/domain/workspace-passage-knowledge";
import { chapterContextItems } from "../../lib/domain/workspace-passage-knowledge";
import { SourcePagePreview } from "../common/source-page-preview";

function ContextEntry({ item }: { item: WorkspacePassageKnowledgeItem }) {
  const [open, setOpen] = useState(false);
  const openSource = useSourceReader();
  const analysis = item.passageRelation.payload.contextualAnalysis!;
  const visual = analysis.sourceVisual;
  const page = visual?.physicalPage ?? (item.pages[0] ?? 0) + 1;
  const scope = item.passageRelation.payload.relationScope;
  return (
    <details
      className="rounded-md border border-border p-3"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {visual?.caption ?? analysis.sourceContext?.locator ?? analysis.title}
        <span className="mt-1 block text-xs font-normal text-muted-foreground">
          {scope === "book"
            ? "Contexto do livro — não exclusivo deste capítulo"
            : "Contexto da passagem"}
          {visual ? " · mapa/ilustração da fonte" : ""}
        </span>
      </summary>
      {open && (
        <div className="mt-3 space-y-2">
          {analysis.historicalContext && (
            <dl className="space-y-1 text-xs">
              <div>
                <dt className="font-medium">Lugar</dt>
                <dd>{analysis.historicalContext.place}</dd>
              </div>
              <div>
                <dt className="font-medium">Período indicado pela fonte</dt>
                <dd>{analysis.historicalContext.period}</dd>
              </div>
              <div>
                <dt className="font-medium">Natureza da informação</dt>
                <dd>
                  {
                    {
                      "reported-find": "Achado relatado pela fonte",
                      "historical-reconstruction": "Reconstrução histórica",
                      "theological-interpretation": "Interpretação teológica",
                    }[analysis.historicalContext.evidenceType]
                  }
                </dd>
              </div>
              <div>
                <dt className="font-medium">Limites da evidência</dt>
                <dd>{analysis.historicalContext.qualification}</dd>
              </div>
            </dl>
          )}
          {visual && (
            <button
              type="button"
              className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Ler ${visual.caption} e criar nota`}
              onClick={() => openSource(passageReadingSource(item))}
            >
              <SourcePagePreview
                documentId={item.document.id}
                page={page}
                caption={visual.caption}
              />
              <span className="mt-2 block text-xs text-primary underline">
                Ampliar imagem e ler a fonte
              </span>
            </button>
          )}
          <p className="whitespace-pre-line text-sm leading-relaxed">{analysis.summary}</p>
          <button
            type="button"
            onClick={() => openSource(passageReadingSource(item))}
            className="block text-left text-xs text-primary underline underline-offset-4"
          >
            {item.document.title} · p. {page} · ler e anotar
          </button>
          <p className="text-xs text-muted-foreground">
            Interpretação e cronologia da fonte.{" "}
            {item.reviewState === "confirmed"
              ? "Ligação revisada."
              : "Ligação automática; auditoria pendente."}
          </p>
        </div>
      )}
    </details>
  );
}

export function ChapterSourceContext({
  items,
}: {
  items: readonly WorkspacePassageKnowledgeItem[];
}) {
  const contexts = chapterContextItems(items);
  if (!contexts.length) return null;
  return (
    <section aria-label="Contexto histórico e geográfico da biblioteca" className="space-y-2">
      <h3 className="meta-label">História, geografia e imagens</h3>
      <p className="text-xs text-muted-foreground">
        Fontes ligadas à seleção atual. Contexto geral do livro fica identificado como tal.
      </p>
      {contexts.slice(0, 4).map((item) => (
        <ContextEntry key={item.id} item={item} />
      ))}
      {contexts.length > 4 && (
        <details>
          <summary className="cursor-pointer text-xs text-primary">
            Mais {contexts.length - 4} trechos de contexto
          </summary>
          <div className="mt-2 space-y-2">
            {contexts.slice(4).map((item) => (
              <ContextEntry key={item.id} item={item} />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
