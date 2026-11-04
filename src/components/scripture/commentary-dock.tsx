import { ChevronLeft, ChevronRight, PanelBottom, X } from "lucide-react";
import type { ReactNode } from "react";

/** "inline": a chip per source under each verse; "full": every note open under its verse. */
export type CommentaryLayout = "inline" | "full" | "dock" | "hidden";

export function CommentaryDock({
  label,
  verses,
  selectedVerse,
  onSelectVerse,
  onClose,
  children,
}: {
  label: string;
  verses: readonly number[];
  selectedVerse: number;
  onSelectVerse: (verse: number) => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const index = verses.indexOf(selectedVerse);
  return (
    <section className="commentary-dock" aria-label="Painel de comentários">
      <header className="commentary-dock-toolbar">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <PanelBottom className="size-4" /> Comentários{" "}
          <span className="text-muted-foreground">· {label}</span>
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Comentários do versículo anterior"
            disabled={index <= 0}
            onClick={() => onSelectVerse(verses[index - 1]!)}
            className="dock-icon"
          >
            <ChevronLeft className="size-4" />
          </button>
          <select
            aria-label="Passagem dos comentários"
            value={selectedVerse}
            onChange={(event) => onSelectVerse(Number(event.target.value))}
            className="h-8 max-w-40 border border-input bg-background px-2 text-sm pointer-coarse:min-h-11"
          >
            <option value={0}>Capítulo inteiro</option>
            {verses.map((verse) => (
              <option key={verse} value={verse}>
                Versículo {verse}
              </option>
            ))}
          </select>
          <button
            type="button"
            aria-label="Comentários do próximo versículo"
            disabled={index === verses.length - 1 || !verses.length}
            onClick={() => onSelectVerse(verses[index + 1]!)}
            className="dock-icon"
          >
            <ChevronRight className="size-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="dock-icon"
            aria-label="Fechar painel de comentários"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>
      <div className="commentary-dock-scroll" tabIndex={0}>
        {children}
      </div>
    </section>
  );
}
