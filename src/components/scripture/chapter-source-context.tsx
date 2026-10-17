import { useEffect, useState } from "react";
import type { WorkspacePassageKnowledgeItem } from "../../lib/domain/workspace-passage-knowledge";
import { chapterContextItems } from "../../lib/domain/workspace-passage-knowledge";
import {
  installationAvailable,
  installationFetch,
} from "../../lib/workspace-runtime/installation-client";

function SourcePagePreview({
  documentId,
  page,
  caption,
}: {
  documentId: string;
  page: number;
  caption: string;
}) {
  const [image, setImage] = useState<string>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let url: string | undefined;
    const abort = new AbortController();
    setImage(undefined);
    setFailed(false);
    void (async () => {
      const checksum = /^private-document:([a-f0-9]{64})$/u.exec(documentId)?.[1];
      if (!checksum || !(await installationAvailable()))
        throw new Error("Prévia requer instalação local.");
      const response = await installationFetch(`covers/${checksum}?page=${page}`, {
        signal: abort.signal,
      });
      const blob = await response.blob();
      if (!active) return;
      url = URL.createObjectURL(blob);
      setImage(url);
    })().catch(() => {
      if (active) setFailed(true);
    });
    return () => {
      active = false;
      abort.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [documentId, page]);
  return image ? (
    <img
      src={image}
      alt={`${caption} — página original ${page}`}
      className="mt-2 h-auto w-full rounded border border-border"
    />
  ) : (
    <p className="mt-2 text-xs text-muted-foreground" role="status">
      {failed
        ? "Prévia indisponível. Abra a fonte pelo link abaixo; nenhum texto foi perdido."
        : "Carregando página original…"}
    </p>
  );
}

function ContextEntry({ item }: { item: WorkspacePassageKnowledgeItem }) {
  const [open, setOpen] = useState(false);
  const analysis = item.passageRelation.payload.contextualAnalysis!;
  const visual = analysis.sourceVisual;
  const page = visual?.physicalPage ?? (item.pages[0] ?? 0) + 1;
  const href = `/library/document/${encodeURIComponent(item.document.id)}?page=${page}&unit=${encodeURIComponent(item.unit.id)}`;
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
          {visual && (
            <SourcePagePreview documentId={item.document.id} page={page} caption={visual.caption} />
          )}
          <p className="whitespace-pre-line text-sm leading-relaxed">{analysis.summary}</p>
          <a href={href} className="block text-xs text-primary underline underline-offset-4">
            {item.document.title} · p. {page} · abrir trecho destacado
          </a>
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
