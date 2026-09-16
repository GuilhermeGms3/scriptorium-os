/**
 * ScriptureToolbar — reader controls: book/chapter navigation, edition,
 * view mode (single / parallel / original / interlinear), notes & x-refs
 * toggles (scaffolding), reading mode.
 */

import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Columns2, Rows3, WholeWord, BookOpenText } from "lucide-react";
import type { Book, Edition } from "../../lib/domain/scripture";
import type { ReaderView } from "./verse";
import { cn } from "../../lib/utils";
import { bookLabel, t } from "../../lib/i18n";

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
}) {
  const navigate = useNavigate();
  const selectableEditions = editions.filter(
    (edition) => edition.kind === "translation" || edition.kind === "original-language",
  );

  return (
    <div
      className="sticky top-0 z-10 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-background/95 px-4 py-2 backdrop-blur"
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
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
          aria-label={t("scripture.previousChapter")}
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="min-w-24 text-center text-sm font-medium">
          {bookLabel(book.id, book.name)}{" "}
          <span className="font-mono text-muted-foreground">{chapter}</span>
        </span>
        <button
          disabled={!hasNext}
          onClick={() =>
            navigate({
              to: "/scripture/$book/$chapter",
              params: { book: book.id, chapter: String(chapter + 1) },
            })
          }
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
          aria-label={t("scripture.nextChapter")}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="h-4 w-px bg-border" aria-hidden />

      {/* Edition */}
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="meta-label">{t("scripture.version")}</span>
        <select
          value={editionId}
          onChange={(e) => onEditionChange(e.target.value)}
          className="h-7 rounded-md border border-input bg-background px-1.5 font-mono text-xs text-foreground"
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
                "flex h-7 items-center gap-1.5 px-2.5 text-xs transition-colors first:rounded-l-md last:rounded-r-md disabled:cursor-not-allowed disabled:opacity-35",
                view === id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground disabled:hover:bg-transparent disabled:hover:text-muted-foreground",
              )}
            >
              <Icon className="size-3.5" strokeWidth={1.75} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
