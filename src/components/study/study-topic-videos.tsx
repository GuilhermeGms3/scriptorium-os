import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ExternalLink, KeyRound, Play, Search, X } from "lucide-react";
import { YouTubeStudyService, type StudyVideo } from "../../lib/application/youtube-study-service";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { studyVideoId } from "../../lib/domain/study-video-link";

export function StudyTopicVideos({
  title,
  onRecord,
  active = true,
}: {
  title: string;
  onRecord: (video: StudyVideo) => void;
  active?: boolean;
}) {
  const revision = useSyncExternalStore(
    YouTubeStudyService.subscribe,
    YouTubeStudyService.revision,
    () => 0,
  );
  const configured = YouTubeStudyService.configured();
  const [key, setKey] = useState("");
  const [query, setQuery] = useState(`${title} estudo`.slice(0, 180));
  const [videos, setVideos] = useState<StudyVideo[]>();
  const [selected, setSelected] = useState<StudyVideo>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [origin, setOrigin] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    setOrigin(window.location.origin);
    return () => controller.current?.abort();
  }, []);
  useEffect(() => {
    controller.current?.abort();
    setVideos(undefined);
    setSelected(undefined);
    setBusy(false);
    setError("");
  }, [revision]);
  async function search() {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setError("");
    setVideos(undefined);
    setSelected(undefined);
    try {
      const items = await YouTubeStudyService.search(query, request.signal);
      if (!request.signal.aborted) setVideos(items);
    } catch (cause) {
      if (!request.signal.aborted)
        setError(cause instanceof Error ? cause.message : "Consulta indisponível.");
    } finally {
      if (!request.signal.aborted) setBusy(false);
    }
  }
  return (
    <section className="topic-videos" aria-label="Vídeos do YouTube">
      <div className="topic-section-heading">
        <p className="meta-label">Ampliar a escuta</p>
        <h2>Vídeos para investigar</h2>
        <p>
          Consulte aulas e conversas sobre {title}. Resultados externos não representam curadoria
          acadêmica do Scriptorium.
        </p>
      </div>
      <details className="my-4 border-y border-border py-3" open={!configured}>
        <summary className="cursor-pointer text-sm">
          Assistir um vídeo por link · sem chave de API
        </summary>
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const id = studyVideoId(videoUrl);
            if (!id) {
              setError("Use um link HTTPS válido de um vídeo do YouTube.");
              return;
            }
            setError("");
            setSelected({
              id,
              title: `Vídeo escolhido sobre ${title}`,
              channel: "Escolha pessoal; não é indicação acadêmica do Scriptorium",
              description: "Vídeo informado pelo usuário; metadados não consultados.",
              publishedAt: "",
            });
          }}
        >
          <label className="min-w-0 flex-1 text-sm">
            Link do vídeo
            <Input
              type="url"
              value={videoUrl}
              onChange={(event) => setVideoUrl(event.target.value)}
              maxLength={2048}
              placeholder="https://www.youtube.com/watch?v=…"
              required
            />
          </label>
          <Button type="submit" variant="outline">
            Abrir vídeo
          </Button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          O player externo só carrega depois da sua escolha. O YouTube precisa de conexão; seus
          livros e notas não são enviados.
        </p>
      </details>
      <details className="topic-api-setup">
        <summary>
          <KeyRound className="size-4" />
          {configured
            ? "YouTube conectado nesta aba · gerenciar chave"
            : "Conectar minha API do YouTube"}
        </summary>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
          Ative a YouTube Data API v3 no Google Cloud e restrinja a chave a essa API e ao site{" "}
          <code>{origin || "desta instalação"}/*</code>. A chave fica somente na memória desta aba e
          é enviada diretamente ao Google nas consultas.
        </p>
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            try {
              YouTubeStudyService.configure(key);
              setKey("");
              setError("");
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "Chave inválida.");
            }
          }}
        >
          <label className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
            Chave da YouTube Data API v3
            <Input
              type="password"
              autoComplete="off"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              maxLength={200}
              placeholder="Cole sua chave aqui"
              required
            />
          </label>
          <Button disabled={!key.trim()}>Usar nesta aba</Button>
          {configured && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                YouTubeStudyService.configure("");
                setKey("");
              }}
            >
              Desconectar
            </Button>
          )}
        </form>
        <a
          className="mt-4 inline-flex items-center gap-2 text-sm text-primary underline"
          href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Abrir configuração no Google Cloud <ExternalLink className="size-3" />
        </a>
      </details>
      <form
        className="my-6 flex flex-wrap gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">Buscar vídeos sobre o tema</span>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={180}
            placeholder="Tema, autor ou pergunta…"
          />
        </label>
        <Button disabled={!configured || busy || query.trim().length < 2}>
          <Search className="mr-2 size-4" />
          {busy ? "Consultando…" : "Buscar no YouTube"}
        </Button>
      </form>
      <p className="text-xs leading-6 text-muted-foreground">
        A consulta só acontece ao buscar. O Google recebe os termos acima; notas e livros privados
        não são enviados. Resultados ficam em cache temporário nesta aba.
      </p>
      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}
      {busy && (
        <p role="status" className="py-8 text-sm text-muted-foreground">
          Consultando vídeos no YouTube…
        </p>
      )}
      {selected && (
        <div className="mt-6">
          <div className="mb-3 flex justify-between gap-4">
            <h3 className="font-serif text-xl">{selected.title}</h3>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Fechar vídeo"
              onClick={() => setSelected(undefined)}
            >
              <X className="size-4" />
            </Button>
          </div>
          {active && (
            <iframe
              className="aspect-video w-full border border-border"
              src={`https://www.youtube-nocookie.com/embed/${selected.id}`}
              title={selected.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          )}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">YouTube · {selected.channel}</span>
            <Button variant="outline" onClick={() => onRecord(selected)}>
              Anotar sobre este vídeo
            </Button>
          </div>
        </div>
      )}
      {videos?.length === 0 && (
        <p className="py-10 text-sm text-muted-foreground">
          Nenhum vídeo retornado. Experimente uma pergunta ou o nome de um autor.
        </p>
      )}
      {videos && videos.length > 0 && (
        <div className="topic-video-grid">
          {videos.map((video) => (
            <article key={video.id}>
              <button
                className="topic-video-preview"
                onClick={() => setSelected(video)}
                aria-label={`Assistir: ${video.title}`}
              >
                <img
                  loading="lazy"
                  src={`https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`}
                  alt=""
                />
                <span>
                  <Play className="size-6" />
                </span>
              </button>
              <h3 className="mt-3 font-serif text-lg leading-snug">{video.title}</h3>
              <p className="mt-2 text-xs text-muted-foreground">YouTube · {video.channel}</p>
              <a
                className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                href={`https://www.youtube.com/watch?v=${video.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir no YouTube <ExternalLink className="size-3" />
              </a>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
