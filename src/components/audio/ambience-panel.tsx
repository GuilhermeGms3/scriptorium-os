import { useEffect, useRef, useState } from "react";
import { Music2, Pause, Play, Upload } from "lucide-react";
import { Button } from "../ui/button";
import { useAudio } from "./use-audio";
import {
  MUSIC_CATEGORIES,
  type MusicTrack,
  type SoundMode,
} from "../../lib/audio/ambience-contracts";
import { prepareMusicImport } from "../../lib/audio/music-import";

export function MusicTransport() {
  const { engine, state } = useAudio();
  const playing = state.ambience.status === "playing" || state.ambience.status === "loading";
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={
        !state.ambience.preferences.selectedTrackId || state.ambience.preferences.mode === "voice"
      }
      aria-label={playing ? "Pausar música" : "Ouvir música"}
      onClick={() => (playing ? engine.ambience?.pause() : void engine.ambience?.play())}
    >
      {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
      {playing ? "Pausar música" : "Ouvir música"}
    </Button>
  );
}
export function AmbiencePanel({ compact = false }: { compact?: boolean }) {
  const { engine, state } = useAudio();
  const music = state.ambience;
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const importing = useRef<AbortController | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  useEffect(() => () => importing.current?.abort(), []);
  async function importFile(file: File | undefined) {
    if (!file || !engine.ambience) return;
    const controller = new AbortController();
    importing.current?.abort();
    importing.current = controller;
    setPending(true);
    setError("");
    setNotice("");
    try {
      const prepared = await prepareMusicImport(file, undefined, controller.signal);
      if (controller.signal.aborted) return;
      const track = await engine.ambience.assets.put(
        prepared.track,
        prepared.blob,
        controller.signal,
      );
      await engine.ambience.refresh();
      if (controller.signal.aborted) return;
      await engine.selectMusic(track.id);
      setNotice("Música guardada neste navegador. Selecione Voz + Música ou Música para ouvir.");
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(cause instanceof Error ? cause.message : "Não foi possível importar a música.");
    } finally {
      if (importing.current === controller) setPending(false);
    }
  }
  const controls = (
    <>
      <fieldset className="mt-3" disabled={!music.available}>
        <legend className="text-sm font-medium">Modo de escuta</legend>
        <div className="mt-2 flex flex-wrap gap-1">
          {(
            [
              ["voice", "Voz"],
              ["mixed", "Voz + Música"],
              ["music", "Música"],
            ] as const
          ).map(([mode, label]) => (
            <Button
              key={mode}
              size="sm"
              variant={music.preferences.mode === mode ? "secondary" : "outline"}
              aria-pressed={music.preferences.mode === mode}
              onClick={() => engine.setSoundMode(mode as SoundMode)}
            >
              {label}
            </Button>
          ))}
        </div>
      </fieldset>
      <label className="mt-4 block text-sm">
        Trilha de fundo
        <select
          aria-label="Trilha de fundo"
          disabled={!music.available}
          value={music.preferences.selectedTrackId ?? ""}
          className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm"
          onChange={(event) => {
            if (event.target.value) void engine.selectMusic(event.target.value);
            else engine.ambience?.configure({ selectedTrackId: null });
          }}
        >
          <option value="">Escolha uma música</option>
          {music.tracks.map((track) => (
            <option key={track.id} value={track.id}>
              {track.title} · {track.category}
            </option>
          ))}
        </select>
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <MusicTransport />
        <span className="text-xs text-muted-foreground">
          {music.status === "playing"
            ? "Tocando"
            : music.status === "loading"
              ? "Carregando…"
              : "Parada / pausada"}
        </span>
      </div>
      <label className="mt-4 block text-sm">
        Volume da música · {Math.round(music.preferences.volume * 100)}%
        <input
          aria-label="Volume da música"
          className="mt-2 w-full"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={music.preferences.volume}
          onChange={(event) => engine.ambience?.configure({ volume: Number(event.target.value) })}
        />
      </label>
      <div className="mt-3 space-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={music.preferences.loop}
            onChange={(event) => engine.ambience?.configure({ loop: event.target.checked })}
          />
          Repetir música
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={music.preferences.pauseWithVoice}
            onChange={(event) =>
              engine.ambience?.configure({ pauseWithVoice: event.target.checked })
            }
          />
          Pausar música junto da narração
        </label>
      </div>
      {music.error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {music.error}
        </p>
      )}
      {music.warning && (
        <p role="status" className="mt-3 text-xs text-amber-700 dark:text-amber-400">
          {music.warning}
        </p>
      )}
      <details className="mt-4" open={!compact}>
        <summary className="cursor-pointer text-sm font-medium">
          Minhas músicas · {music.tracks.length}
        </summary>
        <div className="mt-3 space-y-3">
          <div className="text-sm">
            <Button
              size="sm"
              variant="outline"
              disabled={pending || !music.available}
              onClick={() => fileInput.current?.click()}
            >
              <Upload className="size-4" />
              Adicionar minha música
            </Button>
            <input
              ref={fileInput}
              aria-label="Adicionar minha música"
              className="sr-only"
              type="file"
              accept=".mp3,.wav,.m4a,.aac,audio/mpeg,audio/wav,audio/mp4,audio/aac"
              disabled={pending || !music.available}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                void importFile(file);
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Cópia privada neste navegador/origem. Até 50 MB por música, 100 trilhas ou 500 MB no
            total. Não acompanha Docker, APK ou backup do acervo.
          </p>
          {pending && (
            <p role="status" className="flex items-center gap-3 text-xs">
              Verificando áudio…
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  importing.current?.abort();
                  setPending(false);
                }}
              >
                Cancelar importação
              </Button>
            </p>
          )}
          {notice && (
            <p role="status" className="text-xs">
              {notice}
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {!music.tracks.length && (
            <p className="text-sm text-muted-foreground">
              Nenhuma música importada. O catálogo público ainda não contém trilhas com licença
              verificada.
            </p>
          )}
          <ul className="divide-y divide-border">
            {music.tracks.map((track) => (
              <TrackEditor key={track.id} track={track} onError={setError} />
            ))}
          </ul>
        </div>
      </details>
      <p className="mt-4 text-xs text-muted-foreground">
        Reprodução simultânea, não arquivo mixado. Transições suaves, ducking, favoritos e perfis
        ainda são a próxima entrega.
      </p>
    </>
  );
  return (
    <section
      id="audio-ambience"
      aria-label="Música e Ambiente"
      className={
        compact
          ? "mt-5 border-t border-border pt-4"
          : "mb-8 rounded-lg border border-border bg-card p-5"
      }
    >
      <h2 className="flex items-center gap-2 font-serif text-xl">
        <Music2 className="size-4" />
        Música e Ambiente
      </h2>
      {controls}
    </section>
  );
}
function TrackEditor({ track, onError }: { track: MusicTrack; onError: (error: string) => void }) {
  const { engine } = useAudio();
  const [title, setTitle] = useState(track.title);
  const [category, setCategory] = useState<string>(track.category);
  const [pending, setPending] = useState(false);
  async function save(remove = false) {
    if (
      remove &&
      !window.confirm(
        `Remover a cópia local de “${track.title}”? O arquivo original no computador não será apagado.`,
      )
    )
      return;
    setPending(true);
    onError("");
    try {
      if (remove) await engine.ambience?.remove(track.id);
      else await engine.ambience?.rename(track.id, title, category);
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "Não foi possível alterar a música.");
    } finally {
      setPending(false);
    }
  }
  return (
    <li className="py-3">
      <p className="text-sm font-medium">{track.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, "0")}{" "}
        · {track.category} · uso pessoal; direitos não verificados
      </p>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer">Organizar trilha</summary>
        <label className="mt-2 block">
          Título
          <input
            aria-label={`Título de ${track.title}`}
            value={title}
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-1 w-full rounded border border-input bg-background p-2"
          />
        </label>
        <label className="mt-2 block">
          Categoria
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="mt-1 w-full rounded border border-input bg-background p-2"
          >
            {MUSIC_CATEGORIES.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <div className="mt-2 flex gap-3">
          <Button
            size="sm"
            variant="outline"
            disabled={pending || !title.trim()}
            onClick={() => void save()}
          >
            Salvar trilha
          </Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => void save(true)}>
            Remover trilha
          </Button>
        </div>
      </details>
    </li>
  );
}
