import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import type { Note } from "../../lib/domain/study";

export function NoteLinkPicker({
  notes,
  initialQuery,
  onClose,
  onSelect,
}: {
  notes: readonly Note[];
  initialQuery: string;
  onClose: () => void;
  onSelect: (note: Note) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [selected, setSelected] = useState(0);
  const results = notes
    .filter((note) =>
      note.title.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")),
    )
    .slice(0, 30);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Linkar outra nota</DialogTitle>
          <DialogDescription>
            O vínculo acompanha a nota mesmo se você mudar o título. Use as setas e Enter.
          </DialogDescription>
        </DialogHeader>
        <Input
          aria-label="Encontrar nota para linkar"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(0);
          }}
          role="combobox"
          aria-expanded
          aria-controls="note-link-results"
          aria-autocomplete="list"
          aria-activedescendant={results[selected] ? `note-option-${selected}` : undefined}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setSelected((index) =>
                Math.max(
                  0,
                  Math.min(results.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)),
                ),
              );
            }
            if (event.key === "Enter" && results[selected]) {
              event.preventDefault();
              onSelect(results[selected]!);
            }
          }}
        />
        <ul
          id="note-link-results"
          role="listbox"
          aria-label="Notas disponíveis"
          className="flex max-h-72 flex-col gap-1 overflow-y-auto"
        >
          {results.map((note, index) => (
            <li
              key={note.id}
              id={`note-option-${index}`}
              role="option"
              aria-selected={selected === index}
            >
              <button
                type="button"
                onMouseEnter={() => setSelected(index)}
                onClick={() => onSelect(note)}
                className="flex w-full flex-col gap-1 rounded px-3 py-2 text-left text-sm hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring aria-selected:bg-accent"
                data-selected={selected === index}
                style={selected === index ? { backgroundColor: "var(--accent)" } : undefined}
              >
                <span className="font-medium">{note.title}</span>
                <span className="text-xs text-muted-foreground">
                  {note.id.slice(-12)} · {note.body.slice(0, 90) || "Página em branco"}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {!results.length && (
          <p className="text-sm text-muted-foreground">
            Nenhuma nota encontrada. Crie a nota primeiro para escolher um destino sem ambiguidade.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
