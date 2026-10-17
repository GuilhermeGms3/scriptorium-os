import { useEffect, useRef, useState } from "react";
import { LocalTranslationService } from "../../lib/application/local-translation-service";
import type { LocalTranslation } from "../../lib/domain/semantic-content";

export function PageTranslation({
  id,
  text,
  language,
}: {
  id: string;
  text: string;
  language: string | undefined;
}) {
  const [translation, setTranslation] = useState<LocalTranslation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef<AbortController | null>(null);
  useEffect(() => {
    pending.current?.abort();
    setTranslation(null);
    setError("");
    setBusy(false);
    return () => pending.current?.abort();
  }, [id, text, language]);
  if (!language || language.startsWith("pt") || !text.trim()) return null;
  const supported = language === "en";
  return (
    <section className="my-4 border-y border-border py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Original · {language}. A tradução auxiliar não substitui a fonte.
        </p>
        <button
          type="button"
          disabled={!supported || busy}
          className="border border-input px-3 py-2 text-xs disabled:opacity-50"
          onClick={async () => {
            pending.current?.abort();
            const controller = new AbortController();
            pending.current = controller;
            setBusy(true);
            setError("");
            try {
              const result = await LocalTranslationService.translate(
                {
                  sourceKind: "private-segment",
                  sourceId: id,
                  sourceLanguage: language,
                  text,
                },
                undefined,
                { signal: controller.signal },
              );
              if (!controller.signal.aborted) setTranslation(result);
            } catch (cause) {
              if (!controller.signal.aborted)
                setError(cause instanceof Error ? cause.message : String(cause));
            } finally {
              if (!controller.signal.aborted) setBusy(false);
            }
          }}
        >
          {busy ? "Traduzindo…" : "Traduzir página para português"}
        </button>
      </div>
      {!supported && (
        <p className="mt-2 text-xs text-muted-foreground">
          O modelo instalado é inglês→português; esta língua precisa de outro modelo. Não será
          enviada ao modelo errado.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
      {translation && (
        <div className="mt-3 whitespace-pre-wrap border-l-2 border-primary/40 pl-3 font-serif text-base leading-7">
          {translation.translatedText}
          <p className="mt-2 font-sans text-xs text-muted-foreground">
            Tradução automática · {translation.model} · revisão humana pendente
          </p>
        </div>
      )}
    </section>
  );
}
