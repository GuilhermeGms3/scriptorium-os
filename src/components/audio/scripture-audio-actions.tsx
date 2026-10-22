import { useEffect, useRef, useState } from "react";
import { Headphones } from "lucide-react";
import { Button } from "../ui/button";
import { scriptureNarration } from "../../lib/audio/scripture-narration";
import { useAudio } from "./use-audio";

export function ScriptureAudioActions({
  bookId,
  chapter,
  editionId,
  selectedVerse,
}: {
  bookId: string;
  chapter: number;
  editionId: string;
  selectedVerse: number | null;
}) {
  const { engine } = useAudio();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [end, setEnd] = useState("");
  const request = useRef(0);
  const [notice, setNotice] = useState("");
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );
  async function prepare(queue: boolean, selection: boolean) {
    // Still inside the tap: iOS blocks speech that first starts after the await below.
    if (!queue) engine.unlock();
    const token = ++request.current;
    setPending(true);
    setError("");
    setNotice("");
    try {
      const item = await scriptureNarration(
        bookId,
        chapter,
        editionId,
        selection && selectedVerse !== null ? selectedVerse : undefined,
        selection && selectedVerse !== null ? (end ? Number(end) : selectedVerse) : undefined,
      );
      if (token !== request.current) return;
      if (queue) {
        if (engine.enqueue(item)) setNotice("Passagem adicionada à fila de Áudio.");
        else setError("A fila já contém 30 leituras. Remova uma na área Áudio para continuar.");
      } else {
        engine.load(item);
        engine.play();
      }
    } catch (cause) {
      if (token === request.current)
        setError(cause instanceof Error ? cause.message : "Não foi possível preparar a passagem.");
    } finally {
      if (token === request.current) setPending(false);
    }
  }
  return (
    <details className="border-b border-border bg-card px-4 py-2 text-sm">
      <summary className="w-fit cursor-pointer list-none font-medium">
        <Headphones aria-hidden="true" className="mr-2 inline size-4" />
        Ouvir esta passagem
      </summary>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => void prepare(false, false)}
        >
          Ouvir capítulo
        </Button>
        {selectedVerse !== null && (
          <>
            <span className="text-xs">Seleção: {selectedVerse} até</span>
            <input
              aria-label="Último versículo para narração"
              type="number"
              min={selectedVerse}
              value={end}
              placeholder={String(selectedVerse)}
              onChange={(event) => setEnd(event.target.value)}
              className="w-20 rounded border border-input bg-background px-2 py-1"
            />
            <Button size="sm" disabled={pending} onClick={() => void prepare(false, true)}>
              Ouvir seleção
            </Button>
          </>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => void prepare(true, selectedVerse !== null)}
        >
          Adicionar à fila
        </Button>
        <p className="text-xs text-muted-foreground">
          Texto literal da edição selecionada · somente voz local
        </p>
      </div>
      {pending && (
        <p role="status" className="mt-2 text-xs">
          Preparando passagem…
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-2 text-xs">
          {notice}
        </p>
      )}
    </details>
  );
}
