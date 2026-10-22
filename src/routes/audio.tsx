import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Headphones, BookOpen, Mic2, Library, ListMusic, Play } from "lucide-react";
import { Button } from "../components/ui/button";
import { useAudio } from "../components/audio/use-audio";
import { AudioSourceLink, AudioTransport } from "../components/audio/audio-player";
import { ScriptureRepository } from "../lib/repositories/scripture-repository";
import { createAudioItem, MAX_NARRATION_CHARACTERS } from "../lib/audio/preparation";
import { scriptureNarration } from "../lib/audio/scripture-narration";
import { bookLabel } from "../lib/i18n";
import type { AudioProgress } from "../lib/audio/contracts";
import { AmbiencePanel } from "../components/audio/ambience-panel";

export const Route = createFileRoute("/audio")({
  head: () => ({ meta: [{ title: "Scriptorium Áudio — ler e escutar" }] }),
  component: AudioPage,
});
const SECTIONS = [
  { id: "home", label: "Início", icon: Headphones },
  { id: "reader", label: "Leitor", icon: BookOpen },
  { id: "studio", label: "Estúdio de Voz", icon: Mic2 },
  { id: "library", label: "Biblioteca de Áudio", icon: Library },
  { id: "collection", label: "Minha Coleção", icon: ListMusic },
] as const;
function AudioPage() {
  const { state, engine } = useAudio();
  const [section, setSection] = useState<(typeof SECTIONS)[number]["id"]>("home");
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("pt-BR");
  const [bookId, setBookId] = useState("genesis");
  const [chapter, setChapter] = useState(1);
  const [editionId, setEditionId] = useState(ScriptureRepository.listEditions()[0]!.id);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const operation = useRef(0);
  useEffect(
    () => () => {
      operation.current++;
    },
    [],
  );
  const current = state.item?.segments[state.segmentIndex];
  const book = ScriptureRepository.getBook(bookId);
  const voices = state.voices;
  async function prepare(action: "text" | "passage", queue = false) {
    // Still inside the tap: iOS blocks speech that first starts after the await below.
    if (!queue) engine.unlock();
    const token = ++operation.current;
    setPending(true);
    setError("");
    try {
      const item =
        action === "text"
          ? await createAudioItem({
              title: "Minha leitura pessoal",
              language,
              source: { kind: "personal", id: "manual" },
              text,
            })
          : await scriptureNarration(bookId, chapter, editionId);
      if (token !== operation.current) return;
      if (queue) engine.enqueue(item);
      else {
        engine.load(item);
        engine.play();
      }
    } catch (cause) {
      if (token === operation.current)
        setError(cause instanceof Error ? cause.message : "Não foi possível preparar a leitura.");
    } finally {
      if (token === operation.current) setPending(false);
    }
  }
  async function restore(entry: AudioProgress) {
    if (entry.source.kind !== "scripture") return;
    engine.unlock();
    const token = ++operation.current;
    setPending(true);
    setError("");
    try {
      const source = entry.source;
      const item = await scriptureNarration(
        source.bookId,
        source.chapter,
        source.editionId,
        source.verseStart,
        source.verseEnd,
      );
      if (token !== operation.current) return;
      engine.load(item);
      if (item.contentHash !== entry.contentHash)
        setError(
          "O texto de origem mudou. A leitura foi atualizada e o progresso antigo não foi aplicado.",
        );
      else engine.play();
    } catch (cause) {
      if (token === operation.current)
        setError(cause instanceof Error ? cause.message : "Passagem indisponível.");
    } finally {
      if (token === operation.current) setPending(false);
    }
  }
  const field = "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <header className="border-b border-border pb-5">
        <p className="meta-label">Ler · escutar · continuar estudando</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold">Scriptorium Áudio</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          O texto permanece no centro. Ouça sua leitura com as vozes locais do dispositivo, sem
          enviar o conteúdo à nuvem.
        </p>
      </header>
      <nav
        aria-label="Seções de áudio"
        className="my-5 flex flex-wrap gap-1 border-b border-border pb-3"
      >
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant={section === id ? "secondary" : "ghost"}
            aria-pressed={section === id}
            size="sm"
            onClick={() => setSection(id)}
          >
            <Icon className="size-4" />
            {label}
          </Button>
        ))}
      </nav>
      {state.storageWarning && (
        <p role="status" className="mb-4 text-sm text-amber-600">
          {state.storageWarning}
        </p>
      )}
      {(error || state.error) && (
        <p
          role="alert"
          className="mb-4 rounded-md border border-destructive/40 p-3 text-sm text-destructive"
        >
          {error || state.error}
        </p>
      )}
      {pending && (
        <div role="status" className="mb-4 flex items-center gap-3 text-sm">
          Preparando leitura…
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              operation.current++;
              setPending(false);
            }}
          >
            Cancelar
          </Button>
        </div>
      )}
      <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
        <div className="min-w-0">
          {section === "home" && (
            <section>
              <h2 className="font-serif text-2xl">Um novo jeito de acompanhar a leitura</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Abra uma passagem no Leitor ou selecione um versículo nas Escrituras. A narração
                continua quando você muda de página dentro do aplicativo.
              </p>
              <Button className="mt-4" onClick={() => setSection("reader")}>
                <BookOpen className="size-4" />
                Escolher uma leitura
              </Button>
              <h3 className="mt-8 font-serif text-xl">Continuar ouvindo</h3>
              <History entries={state.history.slice(0, 5)} pending={pending} restore={restore} />
            </section>
          )}
          {section === "reader" && (
            <div className="space-y-8">
              <section aria-label="Escolher passagem bíblica">
                <h2 className="font-serif text-2xl">Escutar as Escrituras</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm">
                    Livro
                    <select
                      value={bookId}
                      className={field}
                      onChange={(event) => {
                        setBookId(event.target.value);
                        setChapter(1);
                      }}
                    >
                      {ScriptureRepository.listBooks().map((book) => (
                        <option key={book.id} value={book.id}>
                          {bookLabel(book.id, book.name)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    Capítulo
                    <input
                      type="number"
                      min="1"
                      max={book?.chapters ?? 1}
                      value={chapter}
                      className={field}
                      onChange={(event) => setChapter(Number(event.target.value))}
                    />
                  </label>
                  <label className="text-sm sm:col-span-2">
                    Edição
                    <select
                      value={editionId}
                      className={field}
                      onChange={(event) => setEditionId(event.target.value)}
                    >
                      {ScriptureRepository.listEditions().map((edition) => (
                        <option value={edition.id} key={edition.id}>
                          {edition.title}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button disabled={pending} onClick={() => void prepare("passage")}>
                    <Play className="size-4" />
                    Ouvir capítulo
                  </Button>
                  <Button
                    disabled={pending}
                    variant="outline"
                    onClick={() => void prepare("passage", true)}
                  >
                    Adicionar à fila
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Leitura literal · sem comentários inseridos · requer voz compatível com o idioma
                  da edição
                </p>
              </section>
              <section className="border-t border-border pt-6">
                <h2 className="font-serif text-2xl">Seu próprio texto</h2>
                <label className="mt-4 block text-sm">
                  Texto para narração
                  <textarea
                    value={text}
                    maxLength={MAX_NARRATION_CHARACTERS}
                    rows={9}
                    className={`${field} font-serif text-base leading-relaxed`}
                    placeholder="Escreva ou cole o trecho que deseja ouvir…"
                    onChange={(event) => setText(event.target.value)}
                  />
                </label>
                <p className="mt-1 text-xs text-muted-foreground">
                  {text.length.toLocaleString("pt-BR")} / 100.000 caracteres · texto mantido somente
                  nesta sessão
                </p>
                <label className="mt-3 block max-w-xs text-sm">
                  Idioma do texto
                  <select
                    value={language}
                    className={field}
                    onChange={(event) => setLanguage(event.target.value)}
                  >
                    <option value="pt-BR">Português brasileiro</option>
                    <option value="en">Inglês</option>
                    <option value="es">Espanhol</option>
                  </select>
                </label>
                <div className="mt-4 flex gap-2">
                  <Button disabled={pending || !text.trim()} onClick={() => void prepare("text")}>
                    Ouvir texto
                  </Button>
                  <Button
                    variant="outline"
                    disabled={pending || !text.trim()}
                    onClick={() => void prepare("text", true)}
                  >
                    Adicionar à fila
                  </Button>
                </div>
              </section>
            </div>
          )}
          {section === "studio" && (
            <section>
              <AmbiencePanel />
              <h2 className="font-serif text-2xl">Vozes do seu dispositivo</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Este primeiro estúdio usa somente vozes locais detectadas de verdade.
                Expressividade, perfis salvos e prévias independentes chegarão em uma próxima etapa.
              </p>
              <ul className="mt-5 divide-y divide-border">
                {voices.map((voice) => (
                  <li key={voice.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-medium">{voice.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {voice.language} · local · sintética
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => engine.configure({ voiceId: voice.id })}
                    >
                      Selecionar voz
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {section === "library" && (
            <section>
              <h2 className="font-serif text-2xl">Biblioteca de Áudio</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Suas músicas importadas estão em Música e Ambiente no player ao lado. No celular,
                continue abaixo.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Ainda não há gravações ou episódios publicados. Nesta fase, a voz é sintetizada
                durante a leitura: não existe arquivo para baixar ou exportar. Sermões, cursos e
                transcrições serão uma entrega editorial própria, com fontes e direitos.
              </p>
            </section>
          )}
          {section === "collection" && (
            <section>
              <h2 className="font-serif text-2xl">Minha Coleção</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Histórico local deste navegador. Playlists, favoritos e arquivos não estão
                implementados nesta fase.
              </p>
              <History entries={state.history} pending={pending} restore={restore} />
            </section>
          )}
        </div>
        <aside
          aria-label="Leitura em reprodução"
          className="min-w-0 self-start rounded-lg border border-border bg-card p-5"
        >
          <p className="meta-label">Agora ouvindo</p>
          {state.item ? (
            <>
              <h2 className="mt-2 font-serif text-xl">{state.item.title}</h2>
              <p className="my-3 text-xs text-muted-foreground">
                Literal · narração sintética local ·{" "}
                {state.status === "ended"
                  ? "Concluída"
                  : `${state.segmentIndex + 1} de ${state.item.segments.length} segmentos`}
              </p>
              <AudioTransport />
              <label className="mt-3 block text-xs">
                Posição por segmento
                <input
                  className="mt-2 w-full"
                  type="range"
                  min="0"
                  max={state.item.segments.length - 1}
                  value={state.segmentIndex}
                  onChange={(event) => engine.seekSegment(Number(event.target.value))}
                />
              </label>
              <p className="mt-2 text-xs text-muted-foreground">
                Sem duração em segundos: este motor não produz um arquivo temporizado.
              </p>
              <blockquote className="my-4 max-h-64 overflow-auto border-l-2 border-primary/50 pl-3 font-serif text-base leading-relaxed">
                {current?.originalText}
              </blockquote>
              <AudioSourceLink source={state.item.source} />
              {state.item.source.kind === "scripture" && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {state.item.source.attribution} · {state.item.source.licenseId}
                </p>
              )}
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Escolha uma passagem ou um texto para começar.
            </p>
          )}
          <div className="mt-5 space-y-4 border-t border-border pt-4">
            <label className="block text-sm">
              Voz local
              <select
                className={field}
                value={state.settings.voiceId}
                onChange={(event) => engine.configure({ voiceId: event.target.value })}
              >
                <option value="">Escolha uma voz</option>
                {voices.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name} · {voice.language}
                  </option>
                ))}
              </select>
            </label>
            {!voices.length && (
              <p role="status" className="text-sm text-muted-foreground">
                Nenhuma voz local foi detectada. Instale uma voz nas configurações de fala do
                dispositivo. Vozes remotas não são habilitadas automaticamente.
              </p>
            )}
            <label className="block text-sm">
              Velocidade · {state.settings.rate}×
              <input
                aria-label="Velocidade de narração"
                className="mt-2 w-full"
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={state.settings.rate}
                onChange={(event) => engine.configure({ rate: Number(event.target.value) })}
              />
            </label>
            <label className="block text-sm">
              Volume · {Math.round(state.settings.volume * 100)}%
              <input
                aria-label="Volume de narração"
                className="mt-2 w-full"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={state.settings.volume}
                onChange={(event) => engine.configure({ volume: Number(event.target.value) })}
              />
            </label>
            <p className="text-xs text-muted-foreground">
              Na voz nativa, a alteração de volume vale no próximo segmento, sem cortar a fala
              atual.
            </p>
          </div>
          {section !== "studio" && <AmbiencePanel compact />}
          <section className="mt-5 border-t border-border pt-4">
            <h3 className="text-sm font-medium">Fila desta sessão · {state.queue.length}</h3>
            {!state.queue.length && (
              <p className="mt-2 text-xs text-muted-foreground">Nenhuma leitura na fila.</p>
            )}
            <ol className="mt-2 space-y-3">
              {state.queue.map((item, index) => (
                <li key={`${item.id}:${index}`} className="text-xs">
                  <p>{item.title}</p>
                  <div className="mt-1 flex gap-3">
                    <button
                      className="underline"
                      onClick={() => {
                        engine.removeQueued(index);
                        engine.load(item);
                        engine.play();
                      }}
                    >
                      Ouvir
                    </button>
                    <button className="underline" onClick={() => engine.removeQueued(index)}>
                      Remover
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
function History({
  entries,
  pending,
  restore,
}: {
  entries: AudioProgress[];
  pending: boolean;
  restore: (entry: AudioProgress) => Promise<void>;
}) {
  if (!entries.length)
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        Seu histórico aparece depois da primeira leitura. Nenhum conteúdo é iniciado
        automaticamente.
      </p>
    );
  return (
    <ul className="mt-3 divide-y divide-border">
      {entries.map((entry) => (
        <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">{entry.title}</p>
            <p className="text-xs text-muted-foreground">
              Segmento {entry.segmentIndex + 1} ·{" "}
              {new Date(entry.updatedAt).toLocaleDateString("pt-BR")}
            </p>
          </div>
          {entry.source.kind === "scripture" ? (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => void restore(entry)}
            >
              Retomar
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">
              Cole novamente o texto pessoal para retomar
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
