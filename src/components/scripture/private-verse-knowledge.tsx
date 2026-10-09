import { BookMarked, Check, ChevronDown, ExternalLink, LockKeyhole, X } from "lucide-react";
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
  type WorkspacePassageKnowledgeItem,
} from "../../lib/domain/workspace-passage-knowledge";
import { bookLabel } from "../../lib/i18n";
import { ScriptureKnowledgeEngine } from "../../lib/knowledge-engine/scripture-knowledge-engine";

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
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        O livro diz: “{item.passageRelation.payload.rawReference}”
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
        <div className="col-span-2 space-y-1 sm:col-span-1">
          <Label htmlFor={`${id}-book`} className="text-[11px]">
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
          <Label htmlFor={`${id}-chapter`} className="text-[11px]">
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
          <Label htmlFor={`${id}-verse`} className="text-[11px]">
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
          <Label htmlFor={`${id}-until`} className="text-[11px]">
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
        <Button type="submit" size="sm" className="h-7" disabled={busy}>
          Mover para cá
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7"
          disabled={busy}
          onClick={onReject}
        >
          Não se encaixa em nenhum versículo
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7"
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
  const unconfirmed = item.reviewState !== "confirmed";
  const relation = item.passageRelation;
  const target = relation.payload.passage;
  const topics = item.proposals.flatMap((proposal) =>
    proposal.payload.kind === "topic-assignment" ? [proposal.payload.domain] : [],
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
        "rounded-md border p-3",
        unconfirmed ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-muted/20",
      )}
    >
      {context === "book-reader" ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium">Ligada a {passageLinkLabel(target)}</p>
          <Link
            to="/scripture/$book/$chapter"
            params={{ book: target.bookId, chapter: String(target.chapter ?? 1) }}
            className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
          >
            Abrir na Bíblia <ExternalLink className="size-3" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium">{item.document.title}</p>
          <span className="inline-flex items-center gap-1 font-mono text-[9px] text-muted-foreground">
            <LockKeyhole className="size-3" /> páginas{" "}
            {item.pages.map((page) => page + 1).join(", ")}
          </span>
        </div>
      )}
      {(item.context.authors.length > 0 || item.context.sectionTitle) && (
        <p className="mt-1 text-[10px] text-muted-foreground">
          {item.context.authors.length ? item.context.authors.join(", ") : "Autor não catalogado"}
          {item.context.sectionTitle ? ` · ${item.context.sectionTitle}` : ""}
        </p>
      )}
      {topics.length > 0 && (
        <p className="mt-1 font-mono text-[9px] uppercase text-muted-foreground">
          {[...new Set(topics)].join(" · ")}
        </p>
      )}
      <p className="mt-2 line-clamp-6 text-xs leading-relaxed text-foreground/90">
        {item.translation?.translatedText ?? item.unit.text}
      </p>
      {(item.translation?.translatedText ?? item.unit.text).length > 700 && (
        <p className="mt-1 text-[10px] text-muted-foreground">
          Trecho abreviado. Abra a fonte para ler a unidade completa no contexto da página.
        </p>
      )}
      {item.context.attributions.length > 0 && (
        <details className="mt-2 text-[10px] text-muted-foreground">
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
          <p className="text-[11px] text-muted-foreground">
            O livro diz: “{relation.payload.rawReference}”
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <p className="flex items-center gap-1.5 text-xs font-medium">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-amber-500" />
              Esta ligação está correta?
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2.5"
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
              className="h-7 gap-1 px-2.5"
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
        <p className="flex flex-wrap items-center gap-1 font-mono text-[9px] text-muted-foreground">
          {item.reviewState === "confirmed"
            ? "Confirmada por você"
            : item.reviewState === "auto-visible"
              ? "Publicada automaticamente · lote auditado"
              : "Detectada automaticamente"}{" "}
          · {RELATION_LABELS[relation.payload.relationType]}
          {item.reviewState === "confirmed" && !correcting && (
            <button
              type="button"
              onClick={() => setCorrecting(true)}
              className="ml-1 font-sans text-[10px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Corrigir
            </button>
          )}
        </p>
        {context === "bible-reader" && (
          <a
            href={`/library/document/${encodeURIComponent(item.document.id)}?page=${(item.pages[0] ?? 0) + 1}`}
            className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
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
  const unconfirmed = matching.filter((item) => item.reviewState !== "confirmed").length;
  const confirmed = matching.length - unconfirmed;
  return (
    <div className="mb-4 ml-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onOpenChange(!open)}
        className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/5 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-amber-500/10 hover:text-foreground"
      >
        {unconfirmed > 0 && (
          <span aria-hidden="true" className="size-1.5 rounded-full bg-amber-500" />
        )}
        <BookMarked className="size-3.5" aria-hidden="true" />
        <span>
          {unconfirmed} por confirmar · {confirmed} {confirmed === 1 ? "confirmada" : "confirmadas"}
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
          {matching.map((item) => (
            <PrivateLinkCard key={item.id} item={item} />
          ))}
        </aside>
      )}
    </div>
  );
}
