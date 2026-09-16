import { useState } from "react";
import { BookMarked, ExternalLink, Plus, Quote } from "lucide-react";
import { CitationService } from "../../lib/application/citation-service";
import type { Citation } from "../../lib/domain/bibliography";
import type { SourceDetails } from "../../lib/repositories/library-repository";
import { EntityRelationPicker } from "../common/entity-relation-picker";

export function ResourceDetails({
  details,
  onChanged,
}: {
  details: SourceDetails;
  onChanged?: () => Promise<void>;
}) {
  const { source, authors, work, edition, citations, relatedClaimIds } = details;
  const [showCitation, setShowCitation] = useState(false);
  const [contentKind, setContentKind] = useState<Citation["contentKind"]>("exact-quote");
  const [page, setPage] = useState("");
  const [content, setContent] = useState("");
  const [claimId, setClaimId] = useState("");
  const [relationship, setRelationship] = useState<"supports" | "challenges" | "qualifies">(
    "supports",
  );
  const [status, setStatus] = useState<string>();

  const createCitation = async () => {
    setStatus("Salvando…");
    try {
      const citation = await CitationService.create({
        sourceId: source.id,
        contentKind,
        ...(page.trim() ? { locator: { sourceId: source.id, pageStart: page.trim() } } : {}),
        ...(contentKind === "exact-quote"
          ? { originalText: content.trim() }
          : contentKind === "reference-only"
            ? {}
            : { note: content.trim() }),
      });
      if (claimId.trim())
        await CitationService.linkToClaim(citation.id, claimId.trim(), relationship);
      setContent("");
      setPage("");
      setClaimId("");
      setStatus("Citação persistida no workspace local.");
      await onChanged?.();
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : String(cause));
    }
  };

  return (
    <article className="p-4 text-sm">
      <p className="meta-label">Fonte acadêmica</p>
      <h2 className="mt-1 font-serif text-xl font-semibold leading-tight">{source.title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {authors.map((author) => author.canonicalName).join(", ") || "Autoria não atribuída"}
      </p>
      <dl className="mt-4 grid grid-cols-[90px_1fr] gap-x-3 gap-y-2 text-xs">
        <dt className="meta-label">Obra</dt>
        <dd>{work?.canonicalTitle ?? "—"}</dd>
        <dt className="meta-label">Edição</dt>
        <dd>{edition?.editionStatement ?? edition?.title ?? "—"}</dd>
        <dt className="meta-label">Publicação</dt>
        <dd>{[source.publisher, source.publicationYear].filter(Boolean).join(", ") || "—"}</dd>
        <dt className="meta-label">Idioma</dt>
        <dd>{source.language ?? "não informado"}</dd>
        <dt className="meta-label">Direitos</dt>
        <dd>
          {source.rights.license ?? (source.rights.localOnly ? "Somente local" : "Não informado")}
        </dd>
      </dl>
      {Object.keys(source.identifiers).length > 0 && (
        <section className="mt-5">
          <h3 className="meta-label">Identificadores</h3>
          <ul className="mt-2 space-y-1">
            {Object.entries(source.identifiers).map(([scheme, value]) => (
              <li key={scheme} className="font-mono text-[11px]">
                <span className="uppercase text-muted-foreground">{scheme}</span> {value}
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="mt-5">
        <div className="flex items-center justify-between">
          <h3 className="meta-label flex items-center gap-1.5">
            <Quote className="size-3" /> Citações
          </h3>
          <button
            type="button"
            onClick={() => setShowCitation((value) => !value)}
            className="inline-flex items-center gap-1 rounded border border-input px-2 py-1 text-[10px]"
          >
            <Plus className="size-3" /> Criar
          </button>
        </div>
        {showCitation && (
          <div className="mt-2 space-y-2 rounded border border-border bg-muted/20 p-2">
            <select
              aria-label="Tipo de conteúdo"
              value={contentKind}
              onChange={(event) => setContentKind(event.target.value as Citation["contentKind"])}
              className="h-8 w-full rounded border border-input bg-background px-2 text-xs"
            >
              <option value="exact-quote">Citação exata</option>
              <option value="paraphrase">Paráfrase</option>
              <option value="summary">Resumo</option>
              <option value="reference-only">Somente referência</option>
            </select>
            <input
              aria-label="Página ou localizador"
              value={page}
              onChange={(event) => setPage(event.target.value)}
              placeholder="Página/localizador"
              className="h-8 w-full rounded border border-input bg-background px-2 text-xs"
            />
            {contentKind !== "reference-only" && (
              <textarea
                aria-label="Conteúdo da citação"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder={contentKind === "exact-quote" ? "Texto original exato" : "Conteúdo"}
                className="min-h-16 w-full rounded border border-input bg-background p-2 text-xs"
              />
            )}
            <EntityRelationPicker
              allowedKinds={["claim"]}
              relationship={relationship}
              onRelationshipChange={setRelationship}
              onSelect={(hit) => setClaimId(hit?.id ?? "")}
            />
            <button
              type="button"
              disabled={contentKind === "exact-quote" && !content.trim()}
              onClick={() => void createCitation()}
              className="h-8 rounded bg-primary px-2 text-xs text-primary-foreground disabled:opacity-50"
            >
              Persistir citação
            </button>
            {status && (
              <p role="status" className="text-[10px] text-muted-foreground">
                {status}
              </p>
            )}
          </div>
        )}
        {citations.length ? (
          <ul className="mt-2 space-y-3">
            {citations.map((citation) => (
              <li key={citation.id} className="border-l-2 border-primary/40 pl-3">
                <p className="font-mono text-[10px] uppercase text-muted-foreground">
                  {citation.contentKind.replaceAll("-", " ")} ·{" "}
                  {citation.locator?.canonicalLocator ??
                    citation.locator?.pageStart ??
                    "sem localizador"}
                </p>
                {citation.originalText && (
                  <blockquote className="mt-1 text-xs leading-relaxed">
                    {citation.originalText}
                  </blockquote>
                )}
                {citation.note && (
                  <p className="mt-1 text-[11px] text-muted-foreground">{citation.note}</p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs italic text-muted-foreground">Nenhuma citação estruturada.</p>
        )}
      </section>
      {relatedClaimIds.length > 0 && (
        <section className="mt-5">
          <h3 className="meta-label flex items-center gap-1.5">
            <BookMarked className="size-3" /> Claims relacionadas
          </h3>
          <ul className="mt-2 space-y-1">
            {relatedClaimIds.map((id) => (
              <li key={id}>
                <a
                  href={`/knowledge?claim=${encodeURIComponent(id)}`}
                  className="inline-flex items-center gap-1 text-xs underline underline-offset-2"
                >
                  Abrir claim relacionada
                  <ExternalLink className="size-3" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      {source.provenance.isDemo && (
        <p className="mt-5 rounded border border-amber-500/30 bg-amber-500/5 p-2 text-[11px] text-muted-foreground">
          DEMO — registro sintético, não é uma publicação acadêmica real.
        </p>
      )}
    </article>
  );
}
