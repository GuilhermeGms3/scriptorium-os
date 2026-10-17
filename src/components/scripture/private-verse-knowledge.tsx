import {
  BookMarked,
  Check,
  ChevronDown,
  CircleHelp,
  ExternalLink,
  LockKeyhole,
  X,
} from "lucide-react";
import { useId, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  passageLinkLabel,
  WorkspacePassageKnowledgeService,
  type PassageLinkReviewContext,
  type PassageLinkTarget,
} from "../../lib/application/workspace-passage-knowledge-service";
import {
  knowledgeItemCoversVerse,
  REFERENCE_ROLE_LABELS,
  type WorkspacePassageKnowledgeItem,
} from "../../lib/domain/workspace-passage-knowledge";
import { bookLabel } from "../../lib/i18n";
import { ScriptureKnowledgeEngine } from "../../lib/knowledge-engine/scripture-knowledge-engine";
import { ReviewStateBadge } from "./review-state-badge";
import { SEMANTIC_DOMAIN_LABELS } from "../../lib/domain/semantic-content";

const RELATION_LABELS: Record<
  WorkspacePassageKnowledgeItem["passageRelation"]["payload"]["relationType"],
  string
> = {
  cites: "cita",
  discusses: "discute",
  "alludes-to": "alude a",
};

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/** "Onde essa informação se encaixaria?" — choose another verse, or reject the link. */
function LinkCorrectionPanel({
  item,
  busy,
  onMove,
  onReject,
  onCancel,
}: {
  item: WorkspacePassageKnowledgeItem;
  busy: boolean;
  onMove: (target: PassageLinkTarget) => void;
  onReject: () => void;
  onCancel: () => void;
}) {
  const id = useId();
  const books = useMemo(() => ScriptureKnowledgeEngine.listBooks(), []);
  const current = item.passageRelation.payload.passage;
  const [bookId, setBookId] = useState(current.bookId);
  const [chapter, setChapter] = useState(String(current.chapter ?? 1));
  const [verse, setVerse] = useState(String(current.verseStart ?? 1));
  const [until, setUntil] = useState(
    current.verseEnd !== undefined && current.verseEnd !== current.verseStart
      ? String(current.verseEnd)
      : "",
  );
  const [error, setError] = useState<string>();
  const book = books.find((candidate) => candidate.id === bookId);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const chapterNumber = Number(chapter);
    const verseNumber = Number(verse);
    const untilNumber = until.trim() ? Number(until) : undefined;
    if (!book) return setError("Escolha um livro.");
    if (!Number.isInteger(chapterNumber) || chapterNumber < 1 || chapterNumber > book.chapters)
      return setError(
        `Escolha um capítulo entre 1 e ${book.chapters} em ${bookLabel(book.id, book.name)}.`,
      );
    if (!Number.isInteger(verseNumber) || verseNumber < 1)
      return setError("Informe um versículo válido.");
    if (untilNumber !== undefined && (!Number.isInteger(untilNumber) || untilNumber < verseNumber))
      return setError("O versículo final não pode vir antes do inicial.");
    setError(undefined);
    onMove({
      bookId: book.id,
      chapter: chapterNumber,
      verseStart: verseNumber,
      ...(untilNumber !== undefined ? { verseEnd: untilNumber } : {}),
    });
  };

  return (
    <form
      onSubmit={submit}
      aria-labelledby={`${id}-title`}
      className="mt-3 rounded border border-amber-500/30 bg-amber-500/5 p-2.5"
    >
      <p id={`${id}-title`} className="text-xs font-medium">
        Onde essa informação se encaixaria?
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        O livro diz: “{item.passageRelation.payload.rawReference}”
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
        <div className="col-span-2 space-y-1 sm:col-span-1">
          <Label htmlFor={`${id}-book`} className="text-xs">
            Livro
          </Label>
          <select
            id={`${id}-book`}
            value={bookId}
            onChange={(event) => setBookId(event.target.value)}
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
          >
            {books.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {bookLabel(candidate.id, candidate.name)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${id}-chapter`} className="text-xs">
            Capítulo
          </Label>
          <Input
            id={`${id}-chapter`}
            type="number"
            inputMode="numeric"
            min={1}
            max={book?.chapters}
            required
            value={chapter}
            onChange={(event) => setChapter(event.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${id}-verse`} className="text-xs">
            Versículo
          </Label>
          <Input
            id={`${id}-verse`}
            type="number"
            inputMode="numeric"
            min={1}
            required
            value={verse}
            onChange={(event) => setVerse(event.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${id}-until`} className="text-xs">
            Até (opcional)
          </Label>
          <Input
            id={`${id}-until`}
            type="number"
            inputMode="numeric"
            min={1}
            value={until}
            onChange={(event) => setUntil(event.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="mt-2.5 flex flex-wrap gap-2">
        <Button type="submit" size="sm" className="h-8" disabled={busy}>
          Mover para cá
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8"
          disabled={busy}
          onClick={onReject}
        >
          Não se encaixa em nenhum versículo
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8"
          disabled={busy}
          onClick={onCancel}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}

/**
 * One private-book link with its human review controls. In the Bible reader it shows which book
 * it comes from; in the book reader it shows which verse it points to.
 */
export function PrivateLinkCard({
  item,
  context = "bible-reader",
}: {
  item: WorkspacePassageKnowledgeItem;
  context?: PassageLinkReviewContext;
}) {
  const [correcting, setCorrecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const unconfirmed = item.reviewState === "pending";
  const relation = item.passageRelation;
  const target = relation.payload.passage;
  const topics = item.proposals.flatMap((proposal) =>
    proposal.payload.kind === "topic-assignment"
      ? [SEMANTIC_DOMAIN_LABELS[proposal.payload.domain] ?? proposal.payload.domain]
      : [],
  );
  const claims = item.proposals.flatMap((proposal) =>
    proposal.payload.kind === "claim" ? [proposal.payload.proposition] : [],
  );
  const argumentsForUnit = item.proposals.flatMap((proposal) =>
    proposal.payload.kind === "argument" ? [proposal.payload] : [],
  );

  // reviewProposal notifies "scriptorium:knowledge-changed", which reloads reader and inspector.
  const act = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(undefined);
    try {
      await action();
      setCorrecting(false);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <article
      className={cn(
        "rounded-md p-3",
        unconfirmed
          ? "border-2 border-dashed border-amber-500/60 bg-amber-500/5"
          : "border border-border bg-muted/20",
      )}
    >
      <ReviewStateBadge state={item.reviewState} className="mb-2" />
      {context === "book-reader" ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium">Ligada a {passageLinkLabel(target)}</p>
          <Link
            to="/scripture/$book/$chapter"
            params={{ book: target.bookId, chapter: String(target.chapter ?? 1) }}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Abrir na Bíblia <ExternalLink className="size-3" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <a
            href={`/library/document/${encodeURIComponent(item.document.id)}?page=${(item.pages[0] ?? 0) + 1}&unit=${encodeURIComponent(item.unit.id)}`}
            className="text-xs font-medium text-primary underline underline-offset-4"
          >
            {item.document.title}
          </a>
          <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
            <LockKeyhole className="size-3" /> páginas{" "}
            {item.pages.map((page) => page + 1).join(", ")}
          </span>
        </div>
      )}
      <Link
        to="/trace"
        search={{ proposal: item.id, state: "all", offset: 0 }}
        className="mt-2 inline-block text-xs text-primary underline underline-offset-4"
      >
        Ver rastro desta ligação
      </Link>
      {(item.context.authors.length > 0 || item.context.sectionTitle) && (
        <p className="mt-1 text-xs text-muted-foreground">
          {item.context.authors.length ? item.context.authors.join(", ") : "Autor não catalogado"}
          {item.context.sectionTitle ? ` · ${item.context.sectionTitle}` : ""}
        </p>
      )}
      {relation.payload.contextualAnalysis && (
        <section className="mt-3 space-y-2 text-xs leading-relaxed">
          <h3 className="font-serif text-base">{relation.payload.contextualAnalysis.title}</h3>
          <a
            href={`/library/document/${encodeURIComponent(item.document.id)}?page=${(item.pages[0] ?? 0) + 1}&unit=${encodeURIComponent(item.unit.id)}`}
            className="block underline decoration-primary/30 underline-offset-4"
          >
            {relation.payload.contextualAnalysis.summary}
          </a>
          <p className="text-xs text-muted-foreground">
            {relation.payload.contextualAnalysis.mode === "source-excerpt"
              ? relation.payload.referenceRole === "proof-text"
                ? "Texto confessional original · citação bíblica, não exegese universal."
                : "Comentário original extraído · ligação automática, não revisada por pessoa."
              : "Síntese contextual assistida por máquina · não revisada por pessoa."}
          </p>
          {relation.payload.contextualAnalysis.sourceContext && (
            <p className="text-xs text-muted-foreground">
              {relation.payload.contextualAnalysis.sourceContext.sectionPath.join(" › ")}
              {relation.payload.contextualAnalysis.sourceContext.traditionLabel
                ? ` · ${relation.payload.contextualAnalysis.sourceContext.traditionLabel}`
                : ""}
            </p>
          )}
          {relation.payload.contextualAnalysis.limitations.map((value) => (
            <p key={value} className="border-l-2 border-amber-500/40 pl-2 text-muted-foreground">
              {value}
            </p>
          ))}
        </section>
      )}
      {!relation.payload.contextualAnalysis && context === "bible-reader" && (
        <blockquote className="mt-3 border-l-2 border-primary/30 pl-3 text-sm leading-relaxed">
          <a
            className="underline decoration-primary/30 underline-offset-4"
            href={`/library/document/${encodeURIComponent(item.document.id)}?page=${(item.pages[0] ?? 0) + 1}&unit=${encodeURIComponent(item.unit.id)}`}
          >
            {item.translation?.translatedText ?? item.unit.text}
          </a>
          <p className="mt-2 text-xs text-muted-foreground">
            Trecho literal da fonte · ligação{" "}
            {item.reviewState === "confirmed"
              ? "confirmada"
              : "automática, ainda não interpretada editorialmente"}
            . Uma citação não comprova que todo o trecho comente este versículo.
          </p>
        </blockquote>
      )}
      {topics.length > 0 && (
        <p className="mt-1 meta-label text-muted-foreground">{[...new Set(topics)].join(" · ")}</p>
      )}
      {claims.length > 0 && (
        <section className="mt-2 rounded border border-border bg-background/60 p-2.5">
          <p className="meta-label">Afirmações extraídas deste trecho</p>
          <ul className="mt-1.5 space-y-1.5">
            {claims.map((claim, index) => (
              <li
                key={`${item.id}:claim:${index}`}
                className="border-l-2 border-primary/40 pl-2 text-xs leading-relaxed"
              >
                {claim}
              </li>
            ))}
          </ul>
        </section>
      )}
      {argumentsForUnit.map((argument, index) => (
        <section
          key={`${item.id}:argument:${index}`}
          className="mt-2 rounded border border-border p-2.5"
        >
          <p className="meta-label">Argumento detectado</p>
          <p className="mt-1 text-xs font-medium">{argument.conclusion}</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-xs text-muted-foreground">
            {argument.premises.map((premise) => (
              <li key={premise}>{premise}</li>
            ))}
          </ol>
        </section>
      ))}
      <details className="mt-2 rounded border border-border/70 px-2.5 py-2">
        <summary className="cursor-pointer text-xs font-medium">
          Ler trecho-fonte {item.translation ? "em português" : "no idioma original"}
        </summary>
        <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-foreground/90">
          {item.translation?.translatedText ?? item.unit.text}
        </p>
        {(item.translation?.translatedText ?? item.unit.text).length > 700 && (
          <p className="mt-1 text-xs text-muted-foreground">
            Trecho abreviado. Abra a fonte para ler a unidade completa no contexto da página.
          </p>
        )}
      </details>
      {item.context.attributions.length > 0 && (
        <details className="mt-2 text-xs text-muted-foreground">
          <summary className="cursor-pointer">Atribuições detectadas</summary>
          <ul className="mt-1 space-y-1">
            {item.context.attributions.map((value, index) => (
              <li key={`${item.id}:attribution:${index}`}>{value}</li>
            ))}
          </ul>
        </details>
      )}

      {unconfirmed && !correcting && (
        <div className="mt-3 rounded border border-amber-500/30 bg-amber-500/10 p-2">
          <p className="text-xs text-muted-foreground">
            O livro diz: “{relation.payload.rawReference}”
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <CircleHelp
                className="size-4 text-amber-700 dark:text-amber-400"
                aria-hidden="true"
              />
              Esta ligação está correta?
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1 px-2.5"
              disabled={busy}
              onClick={() =>
                void act(() =>
                  WorkspacePassageKnowledgeService.confirmLink(item.id, undefined, context),
                )
              }
            >
              <Check className="size-3.5" aria-hidden="true" /> Sim
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1 px-2.5"
              disabled={busy}
              onClick={() => setCorrecting(true)}
            >
              <X className="size-3.5" aria-hidden="true" /> Não
            </Button>
          </div>
        </div>
      )}
      {correcting && (
        <LinkCorrectionPanel
          item={item}
          busy={busy}
          onMove={(destination) =>
            void act(() =>
              WorkspacePassageKnowledgeService.moveLink(relation, destination, undefined, context),
            )
          }
          onReject={() =>
            void act(() => WorkspacePassageKnowledgeService.rejectLink(item.id, undefined, context))
          }
          onCancel={() => {
            setCorrecting(false);
            setError(undefined);
          }}
        />
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="flex flex-wrap items-center gap-1 font-mono text-xs text-muted-foreground">
          {item.reviewState === "confirmed"
            ? "Confirmada por você"
            : item.reviewState === "auto-visible"
              ? "Publicada automaticamente · política documental"
              : "Detectada automaticamente"}{" "}
          · {RELATION_LABELS[relation.payload.relationType]}
          {relation.payload.referenceRole &&
            ` · ${REFERENCE_ROLE_LABELS[relation.payload.referenceRole]}`}
          {item.reviewState !== "pending" && !correcting && (
            <button
              type="button"
              onClick={() => setCorrecting(true)}
              className="ml-1 font-sans text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Corrigir
            </button>
          )}
        </p>
        {context === "bible-reader" && (
          <a
            href={`/library/document/${encodeURIComponent(item.document.id)}?page=${(item.pages[0] ?? 0) + 1}&unit=${encodeURIComponent(item.unit.id)}`}
            className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-4"
          >
            Abrir fonte <ExternalLink className="size-3" />
          </a>
        )}
      </div>
    </article>
  );
}

/** Compact private-library links under a verse: a chip that opens and closes the cards. */
export function PrivateVerseKnowledge({
  chapter,
  verse,
  items,
  sourceId,
  domain,
  bookId,
  open,
  onOpenChange,
}: {
  bookId: string;
  chapter: number;
  verse: number;
  items: WorkspacePassageKnowledgeItem[];
  sourceId?: string;
  domain?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const panelId = useId();
  const matching = items.filter((item) => {
    if (!knowledgeItemCoversVerse(item, bookId, chapter, verse)) return false;
    if (sourceId && item.document.id !== sourceId) return false;
    if (
      domain &&
      !item.proposals.some(
        (proposal) =>
          proposal.payload.kind === "topic-assignment" && proposal.payload.domain === domain,
      )
    )
      return false;
    return true;
  });
  if (!matching.length) return null;
  const unconfirmed = matching.filter((item) => item.reviewState === "pending").length;
  const published = matching.length - unconfirmed;
  // A detected cross-reference is not automatically commentary on this verse.
  const contextual = matching
    .filter((item) => item.passageRelation.payload.contextualAnalysis)
    .sort((a, b) => {
      const width = (item: WorkspacePassageKnowledgeItem) => {
        const address = item.passageRelation.payload.passage;
        return (address.verseEnd ?? address.verseStart ?? 0) - (address.verseStart ?? 0);
      };
      return (
        width(a) - width(b) ||
        a.document.title.localeCompare(b.document.title, "pt-BR") ||
        (a.pages[0] ?? 0) - (b.pages[0] ?? 0) ||
        (a.unit.spans[0]?.startOffset ?? 0) - (b.unit.spans[0]?.startOffset ?? 0)
      );
    });
  // Confirming a reference is not reviewing its contents as exegesis. Literal links stay in
  // the expandable library panel; only contextual reading becomes inline commentary.
  const previews = contextual;
  return (
    <div className="mb-4 ml-4">
      {!open &&
        previews.map((preview) => {
          const previewHref = `/library/document/${encodeURIComponent(preview.document.id)}?page=${(preview.pages[0] ?? 0) + 1}&unit=${encodeURIComponent(preview.unit.id)}`;
          const address = preview.passageRelation.payload.passage;
          const analysis = preview.passageRelation.payload.contextualAnalysis;
          const longPatristicContext =
            analysis?.sourceContext?.kind === "patristic-exposition" &&
            analysis.summary.length > 1500;
          const broad =
            (address.verseEnd ?? address.verseStart ?? 0) - (address.verseStart ?? 0) > 6 ||
            longPatristicContext;
          const commentary = (
            <a
              href={previewHref}
              className="mt-2 block font-serif text-sm leading-relaxed underline decoration-primary/30 underline-offset-4"
            >
              {preview.passageRelation.payload.contextualAnalysis?.summary ??
                preview.translation?.translatedText ??
                preview.unit.text}
            </a>
          );
          return (
            <aside
              key={preview.id}
              className="mb-2 border-l-2 border-primary/25 pl-3"
              aria-label={`Trecho da biblioteca para o versículo ${verse}`}
            >
              <a href={previewHref} className="text-xs text-primary underline underline-offset-4">
                {preview.document.title} · p. {preview.pages.map((page) => page + 1).join(", ")}
              </a>
              {broad ? (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-muted-foreground">
                    Contexto de {passageLinkLabel(address)}
                    {longPatristicContext ? " · exposição patrística" : ""}
                  </summary>
                  {commentary}
                </details>
              ) : (
                commentary
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {preview.passageRelation.payload.contextualAnalysis?.mode === "source-excerpt"
                  ? preview.passageRelation.payload.referenceRole === "proof-text"
                    ? `Texto confessional original · ${preview.passageRelation.payload.contextualAnalysis.sourceContext?.traditionLabel ?? "tradição da fonte"} · citação, não exegese universal`
                    : "Comentário original da fonte"
                  : preview.passageRelation.payload.contextualAnalysis
                    ? "Síntese contextual assistida"
                    : "Trecho literal da fonte"}{" "}
                ·{" "}
                {preview.reviewState === "confirmed"
                  ? "ligação confirmada"
                  : "ligação automática, não é interpretação revisada"}
                . Abra a fonte para ler o trecho completo.
              </p>
            </aside>
          );
        })}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onOpenChange(!open)}
        className={cn(
          "inline-flex min-h-8 items-center gap-1.5 rounded-full border bg-amber-500/5 px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-amber-500/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          unconfirmed > 0 ? "border-dashed border-amber-500/70" : "border-amber-500/30",
        )}
      >
        {unconfirmed > 0 && (
          <CircleHelp className="size-3.5 text-amber-700 dark:text-amber-400" aria-hidden="true" />
        )}
        <BookMarked className="size-3.5" aria-hidden="true" />
        <span>
          {unconfirmed > 0
            ? `${unconfirmed} por confirmar · ${published} ${published === 1 ? "publicado" : "publicados"}`
            : `${published} ${published === 1 ? "ligação na biblioteca" : "ligações na biblioteca"}`}
        </span>
        <ChevronDown
          className={cn("size-3 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {open && (
        <aside
          id={panelId}
          className="mt-2 space-y-2 border-l-2 border-amber-500/30 pl-3"
          aria-label={`Biblioteca conectada ao versículo ${verse}`}
        >
          <p className="rounded border border-border bg-muted/20 p-2 text-xs leading-relaxed text-muted-foreground">
            Trechos organizados por fonte e página. Ligações automáticas e sínteses assistidas não
            equivalem a comentários editorialmente revisados.
          </p>
          {matching.map((item) => (
            <PrivateLinkCard key={item.id} item={item} />
          ))}
        </aside>
      )}
    </div>
  );
}
