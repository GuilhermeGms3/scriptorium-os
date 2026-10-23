/**
 * ScriptureToolbar — reader controls on one line: book/chapter navigation and a verse jump always
 * visible; translation, commentary and view mode inline when there is room, otherwise behind
 * "Opções" (phones, or the text column next to the study panel).
 */

import { useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Columns2,
  Rows3,
  WholeWord,
  BookOpenText,
  MessagesSquare,
  SlidersHorizontal,
} from "lucide-react";
import type { Book, Edition } from "../../lib/domain/scripture";
import type { ReaderView } from "./verse";
import { cn } from "../../lib/utils";
import { t } from "../../lib/i18n";
import { BookChapterPicker } from "./book-chapter-picker";
import type { CommentaryLayout } from "./commentary-dock";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const VIEWS: { id: ReaderView; label: string; icon: typeof Rows3 }[] = [
  { id: "single", label: t("scripture.view.single"), icon: Rows3 },
  { id: "parallel", label: t("scripture.view.parallel"), icon: Columns2 },
  { id: "original", label: t("scripture.view.original"), icon: BookOpenText },
  { id: "interlinear", label: t("scripture.view.interlinear"), icon: WholeWord },
];

const COMMENTARY_LAYOUTS: { id: CommentaryLayout; label: string }[] = [
  { id: "inline", label: "Comentários resumidos" },
  { id: "full", label: "Comentários completos" },
  { id: "dock", label: "Comentários no painel" },
  { id: "hidden", label: "Ocultar comentários" },
];

export function ScriptureToolbar({
  book,
  chapter,
  editions,
  editionId,
  onEditionChange,
  view,
  onViewChange,
  hasPrev,
  hasNext,
  availableViews,
  commentaryLayout,
  onCommentaryLayoutChange,
  explanationsAvailable,
  verses,
  selectedVerse,
  onVerseChange,
}: {
  book: Book;
  chapter: number;
  editions: Edition[];
  editionId: string;
  onEditionChange: (id: string) => void;
  view: ReaderView;
  onViewChange: (v: ReaderView) => void;
  hasPrev: boolean;
  hasNext: boolean;
  availableViews: Record<ReaderView, boolean>;
  commentaryLayout: CommentaryLayout;
  onCommentaryLayoutChange: (value: CommentaryLayout) => void;
  explanationsAvailable: boolean;
  /** Verse numbers of the open chapter, for the "go to verse" list. */
  verses: readonly number[];
  selectedVerse: number | null;
  onVerseChange: (verse: number) => void;
}) {
  const navigate = useNavigate();
  const selectableEditions = editions.filter(
    (edition) => edition.kind === "translation" || edition.kind === "original-language",
  );
  const commentaryDisabled = !explanationsAvailable || view !== "single";

  /** Translation, commentary and view mode: in a row, or stacked with their names in "Opções". */
  const controls = (stacked: boolean) => (
    <>
      <label
        className={cn(
          "flex text-sm",
          stacked ? "flex-col gap-1.5" : "items-center gap-1.5 text-muted-foreground",
        )}
      >
        <span className={stacked ? "font-medium" : "meta-label"}>{t("scripture.version")}</span>
        <select
          value={editionId}
          onChange={(e) => onEditionChange(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
          aria-label={t("scripture.translation")}
        >
          {selectableEditions.map((ed) => (
            <option key={ed.id} value={ed.id}>
              {stacked ? ed.title : ed.abbreviation}
            </option>
          ))}
        </select>
      </label>

      <label className={cn("flex text-sm", stacked ? "flex-col gap-1.5" : "items-center gap-1.5")}>
        {stacked ? (
          <span className="font-medium">Comentários</span>
        ) : (
          <MessagesSquare className="size-4" aria-hidden="true" />
        )}
        <select
          aria-label="Como mostrar os comentários"
          {...(stacked ? {} : { id: "commentary-layout" })}
          title={
            explanationsAvailable
              ? "Escolha como ler os comentários"
              : "Sem comentários indexados neste capítulo"
          }
          value={commentaryLayout}
          disabled={commentaryDisabled}
          onChange={(event) => onCommentaryLayoutChange(event.target.value as CommentaryLayout)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-40"
        >
          {COMMENTARY_LAYOUTS.map((layout) => (
            <option key={layout.id} value={layout.id}>
              {layout.label}
            </option>
          ))}
        </select>
        {stacked && commentaryDisabled && (
          <span className="text-xs text-muted-foreground">
            {explanationsAvailable
              ? "Disponível no modo Leitura."
              : "Sem comentários indexados neste capítulo."}
          </span>
        )}
      </label>

      <div className={cn("flex text-sm", stacked ? "flex-col gap-1.5" : "items-center")}>
        {stacked && <span className="font-medium">{t("scripture.viewMode")}</span>}
        <div
          className={cn("flex rounded-md border border-input", stacked && "flex-col")}
          role="group"
          aria-label={t("scripture.viewMode")}
        >
          {VIEWS.map(({ id, label, icon: Icon }) => {
            const enabled = availableViews[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => onViewChange(id)}
                disabled={!enabled}
                aria-pressed={view === id}
                title={enabled ? label : t("scripture.viewUnavailable", { view: label })}
                className={cn(
                  "flex h-9 items-center gap-1.5 px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-35",
                  stacked
                    ? "first:rounded-t-md last:rounded-b-md"
                    : "first:rounded-l-md last:rounded-r-md",
                  view === id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground disabled:hover:bg-transparent disabled:hover:text-muted-foreground",
                )}
              >
                <Icon className="size-4" strokeWidth={1.75} aria-hidden="true" />
                {/* In the row only the current mode keeps its name; in "Opções", all do. */}
                <span className={stacked || view === id ? "inline" : "hidden"}>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );

  return (
    // A container: it adapts to its own width (the text column), not to the window's.
    <div
      className="@container sticky top-0 z-10 border-b border-border bg-background/95 px-3 py-2 backdrop-blur"
      role="toolbar"
      aria-label={t("scripture.toolbar")}
    >
      <div className="flex items-center gap-2">
        {/* Book / chapter */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            disabled={!hasPrev}
            onClick={() =>
              navigate({
                to: "/scripture/$book/$chapter",
                params: { book: book.id, chapter: String(chapter - 1) },
              })
            }
            className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
            aria-label={t("scripture.previousChapter")}
          >
            <ChevronLeft className="size-4" />
          </button>
          <BookChapterPicker book={book} chapter={chapter} />
          <button
            type="button"
            disabled={!hasNext}
            onClick={() =>
              navigate({
                to: "/scripture/$book/$chapter",
                params: { book: book.id, chapter: String(chapter + 1) },
              })
            }
            className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
            aria-label={t("scripture.nextChapter")}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* Go straight to a verse: pick its number, no scrolling through the chapter. */}
        {verses.length > 0 && (
          <select
            aria-label="Ir para o versículo"
            value={selectedVerse ?? ""}
            onChange={(event) => onVerseChange(Number(event.target.value))}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
          >
            <option value="" disabled>
              Versículo
            </option>
            {verses.map((verse) => (
              <option key={verse} value={verse}>
                v. {verse}
              </option>
            ))}
          </select>
        )}

        <div className="flex-1" />

        <div className="hidden items-center gap-3 @min-[60rem]:flex">{controls(false)}</div>

        <Popover>
          <PopoverTrigger
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-input px-3 text-sm text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring @min-[60rem]:hidden"
            aria-label="Opções de leitura: tradução, comentários e modo"
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            <span className="hidden @min-[28rem]:inline">Opções</span>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 space-y-4">
            {controls(true)}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
