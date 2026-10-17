/**
 * ScriptureToolbar — reader controls: book/chapter navigation, edition,
 * view mode (single / parallel / original / interlinear), notes & x-refs
 * toggles (scaffolding), reading mode.
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
} from "lucide-react";
import type { Book, Edition } from "../../lib/domain/scripture";
import type { ReaderView } from "./verse";
import { cn } from "../../lib/utils";
import { t } from "../../lib/i18n";
import { BookChapterPicker } from "./book-chapter-picker";
import type { CommentaryLayout } from "./commentary-dock";

const VIEWS: { id: ReaderView; label: string; icon: typeof Rows3 }[] = [
  { id: "single", label: t("scripture.view.single"), icon: Rows3 },
  { id: "parallel", label: t("scripture.view.parallel"), icon: Columns2 },
  { id: "original", label: t("scripture.view.original"), icon: BookOpenText },
  { id: "interlinear", label: t("scripture.view.interlinear"), icon: WholeWord },
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
}) {
  const navigate = useNavigate();
  const selectableEditions = editions.filter(
    (edition) => edition.kind === "translation" || edition.kind === "original-language",
  );

  return (
    // A container: with the study panel open the text column is narrow, so the toolbar adapts to
    // its own width (one line), not to the window's.
    <div
      className="@container sticky top-0 z-10 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-background/95 px-4 py-2 backdrop-blur"
      role="toolbar"
      aria-label={t("scripture.toolbar")}
    >
      {/* Book / chapter */}
      <div className="flex items-center gap-1">
        <button
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

      <div className="h-4 w-px bg-border" aria-hidden />

      {/* Edition */}
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="meta-label hidden @min-[60rem]:inline">{t("scripture.version")}</span>
        <select
          value={editionId}
          onChange={(e) => onEditionChange(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
          aria-label={t("scripture.translation")}
        >
          {selectableEditions.map((ed) => (
            <option key={ed.id} value={ed.id}>
              {ed.abbreviation}
            </option>
          ))}
        </select>
      </label>

      <div className="flex-1" />

      <label className="flex items-center gap-1.5 text-sm">
        <MessagesSquare className="size-4" aria-hidden="true" />
        <select
          aria-label="Posição dos comentários"
          id="commentary-layout"
          title={
            explanationsAvailable
              ? "Escolha onde ler os comentários"
              : "Sem comentários indexados neste capítulo"
          }
          value={commentaryLayout}
          disabled={!explanationsAvailable || view !== "single"}
          onChange={(event) => onCommentaryLayoutChange(event.target.value as CommentaryLayout)}
          className="h-9 max-w-48 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-40"
        >
          <option value="inline">Comentários no texto</option>
          <option value="dock">Comentários no painel</option>
          <option value="hidden">Ocultar comentários</option>
        </select>
      </label>

      {/* View mode */}
      <div
        className="flex rounded-md border border-input"
        role="group"
        aria-label={t("scripture.viewMode")}
      >
        {VIEWS.map(({ id, label, icon: Icon }) => {
          const enabled = availableViews[id];
          return (
            <button
              key={id}
              onClick={() => onViewChange(id)}
              disabled={!enabled}
              aria-pressed={view === id}
              title={enabled ? label : t("scripture.viewUnavailable", { view: label })}
              className={cn(
                "flex h-9 items-center gap-1.5 px-3 text-sm transition-colors first:rounded-l-md last:rounded-r-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-35",
                view === id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground disabled:hover:bg-transparent disabled:hover:text-muted-foreground",
              )}
            >
              <Icon className="size-4" strokeWidth={1.75} aria-hidden="true" />
              {/* When space is short only the current mode keeps its name; the others keep
                  their icon and title. */}
              <span className={view === id ? "inline" : "hidden @min-[60rem]:inline"}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
