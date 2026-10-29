import { Link } from "@tanstack/react-router";
import { Pause, Play, SkipBack, SkipForward, X, Headphones } from "lucide-react";
import { Button } from "../ui/button";
import { useAudio } from "./use-audio";
import type { AudioSource } from "../../lib/audio/contracts";
import { MusicTransport } from "./ambience-panel";

export function AudioSourceLink({ source }: { source: AudioSource }) {
  return source.kind === "scripture" ? (
    <Link
      className="text-sm underline underline-offset-4"
      to="/scripture/$book/$chapter"
      params={{ book: source.bookId, chapter: String(source.chapter) }}
      search={{
        edition: source.editionId,
        ...(source.verseStart !== undefined ? { v: source.verseStart } : {}),
      }}
    >
      Voltar ao texto
    </Link>
  ) : (
    <span className="text-xs text-muted-foreground">Texto pessoal · disponível nesta sessão</span>
  );
}
export function AudioTransport({ compact = false }: { compact?: boolean }) {
  const { engine, state } = useAudio();
  if (!state.item || state.ambience.preferences.mode === "music") return null;
  const playing = state.status === "playing";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Segmento anterior"
        disabled={state.segmentIndex === 0}
        onClick={() => engine.seekSegment(state.segmentIndex - 1)}
      >
        <SkipBack className="size-4" />
      </Button>
      <Button
        variant={compact ? "secondary" : "default"}
        aria-label={playing ? "Pausar narração" : "Reproduzir narração"}
        disabled={state.status === "loading"}
        onClick={() => (playing ? engine.pause() : engine.play())}
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        <span>{state.status === "loading" ? "Iniciando…" : playing ? "Pausar" : "Ouvir"}</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Próximo segmento"
        disabled={state.segmentIndex + 1 >= state.item.segments.length}
        onClick={() => engine.seekSegment(state.segmentIndex + 1)}
      >
        <SkipForward className="size-4" />
      </Button>
      <span className="text-xs tabular-nums text-muted-foreground">
        {state.segmentIndex + 1}/{state.item.segments.length}
      </span>
    </div>
  );
}
export function AudioMiniPlayer() {
  const { engine, state } = useAudio();
  const musicOnly = state.ambience.preferences.mode === "music" || !state.item;
  const musicTrack = state.ambience.tracks.find(
    (track) => track.id === state.ambience.preferences.selectedTrackId,
  );
  if (
    !state.item &&
    !(musicTrack && state.ambience.preferences.mode !== "voice" && state.ambience.status !== "idle")
  )
    return null;
  return (
    <section
      aria-label="Player de áudio"
      className="shrink-0 border-t border-border bg-card px-3 py-2 md:px-5"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1">
        <Headphones aria-hidden="true" className="hidden size-5 text-primary sm:block" />
        <div className="min-w-0 flex-1 basis-32">
          <Link
            to="/audio"
            className="block truncate text-sm font-medium underline-offset-4 hover:underline"
          >
            {musicOnly ? (musicTrack?.title ?? "Música e Ambiente") : state.item?.title}
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            {musicOnly
              ? "Somente música · arquivo pessoal local"
              : `${state.voices.find((voice) => voice.id === state.settings.voiceId)?.name ?? "Escolha uma voz local"} · Narração sintética`}
          </p>
        </div>
        {musicOnly ? <MusicTransport /> : <AudioTransport compact />}
        <Link to="/audio" hash="audio-ambience" className="text-xs underline underline-offset-4">
          Ambiente
        </Link>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Fechar reprodução"
          onClick={() => engine.stopAll()}
        >
          <X className="size-4" />
        </Button>
      </div>
      {(state.error || state.ambience.error) && (
        <p role="alert" className="mx-auto mt-1 max-w-6xl text-xs text-destructive">
          {state.error || state.ambience.error}{" "}
          <Link to="/audio" className="underline">
            Abrir opções
          </Link>
        </p>
      )}
    </section>
  );
}
