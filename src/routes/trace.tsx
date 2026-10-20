import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLink } from "../components/common/app-link";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { ArrowLeft, GitBranch, RefreshCw } from "lucide-react";
import { Button } from "../components/ui/button";
import { TraceFilterSchema, type KnowledgeTraceItem } from "../lib/domain/knowledge-trace";
import { KnowledgeTraceRepository } from "../lib/repositories/knowledge-trace-repository";
import {
  KnowledgeTraceService,
  explainKnowledgeTrace,
} from "../lib/application/knowledge-trace-service";
import { passageLinkLabel } from "../lib/application/workspace-passage-knowledge-service";
import { ScriptureKnowledgeEngine } from "../lib/knowledge-engine/scripture-knowledge-engine";
import { bookLabel } from "../lib/i18n";
import { ContextualReadingImport } from "../components/library/contextual-reading-import";
import { PageHeader } from "../components/layout/page-header";
import { EmptyState } from "../components/layout/empty-state";
import { ResearchDossier } from "../components/study/research-dossier";

const SearchSchema = TraceFilterSchema.extend({
  proposal: z.string().max(500).optional(),
  q: z.string().trim().max(500).optional(),
  view: z.enum(["research", "history"]).optional(),
});
type TraceSearch = z.infer<typeof SearchSchema>;
export const Route = createFileRoute("/trace")({
  validateSearch: (input: Record<string, unknown>): TraceSearch => SearchSchema.parse(input),
  component: TracePage,
  head: () => ({ meta: [{ title: "Rastro do conhecimento — Scriptorium" }] }),
});
type TraceData = {
  list: Awaited<ReturnType<typeof KnowledgeTraceRepository.list>>;
  documents: Awaited<ReturnType<typeof KnowledgeTraceRepository.documents>>;
  detail: Awaited<ReturnType<typeof KnowledgeTraceService.detail>> | null;
};
const EVENT_LABELS = {
  snapshot: "Estado inicial observado — histórico anterior indisponível",
  registered: "Ligação registrada no motor",
  "proposal-changed": "Referência ou revisão alterada",
  decision: "Decisão de publicação ou auditoria registrada",
  removed: "Ligação removida durante alteração ou reprocessamento",
};
const STATUS_LABELS: Record<string, string> = {
  "machine-visible": "Visível pelo pipeline",
  exception: "Exceção para auditoria",
  withheld: "Retida",
  revoked: "Revogada",
  accepted: "Aceita individualmente",
  rejected: "Rejeitada",
  "machine-proposed": "Proposta de máquina",
  pending: "Auditoria pendente",
  confirmed: "Auditoria confirmada",
};
function stateDescription(json: string): string {
  const parsed: unknown = JSON.parse(json);
  const state = z
    .object({
      reviewStatus: z.string().optional(),
      publication: z.string().nullable().optional(),
      auditStatus: z.string().nullable().optional(),
      reviewNote: z.string().nullable().optional(),
    })
    .parse(parsed);
  return (
    [state.reviewStatus, state.publication, state.auditStatus]
      .filter((value): value is string => !!value)
      .map((value) => STATUS_LABELS[value] ?? value)
      .join(" · ") + (state.reviewNote ? ` — ${state.reviewNote}` : "")
  );
}
function dateLabel(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}

function TraceFilters({
  search,
  documents,
}: {
  search: TraceSearch;
  documents: TraceData["documents"];
}) {
  const navigate = Route.useNavigate();
  const books = ScriptureKnowledgeEngine.listBooks();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const positive = (key: string) => (form.get(key) ? Number(form.get(key)) : undefined);
    void navigate({
      search: {
        view: "history",
        state: search.state,
        offset: 0,
        documentId: String(form.get("documentId") ?? "") || undefined,
        bookId: String(form.get("bookId") ?? "") || undefined,
        chapter: positive("chapter"),
        verse: positive("verse"),
        scheme: String(form.get("scheme") ?? "") || undefined,
      },
    });
  }
  const field = "h-9 w-full min-w-0 rounded border border-input bg-background px-2 text-sm";
  return (
    <form onSubmit={submit} className="space-y-3 border-y border-border py-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1.5fr_0.7fr_0.7fr_auto]">
        <label className="min-w-0 space-y-1 text-xs text-muted-foreground">
          Fonte
          <select
            name="documentId"
            aria-label="Fonte"
            defaultValue={search.documentId ?? ""}
            className={field}
          >
            <option value="">Todos os livros</option>
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.title} ({doc.links})
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0 space-y-1 text-xs text-muted-foreground">
          Livro bíblico
          <select
            name="bookId"
            aria-label="Livro bíblico"
            defaultValue={search.bookId ?? ""}
            className={field}
          >
            <option value="">Todos os livros bíblicos</option>
            {books.map((book) => (
              <option key={book.id} value={book.id}>
                {bookLabel(book.id, book.name)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          Capítulo
          <input
            name="chapter"
            type="number"
            min="1"
            step="1"
            defaultValue={search.chapter}
            className={field}
          />
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          Versículo
          <input
            name="verse"
            type="number"
            min="1"
            step="1"
            defaultValue={search.verse}
            className={field}
          />
        </label>
        <Button type="submit" className="self-end">
          Filtrar rastro
        </Button>
      </div>
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">Esquema de referência</summary>
        <label className="mt-2 block max-w-sm space-y-1">
          Identificador do esquema (opcional)
          <input name="scheme" defaultValue={search.scheme ?? ""} className={field} />
        </label>
        <p className="mt-1">
          Sem este filtro, os esquemas são exibidos separadamente; não há equivalência automática.
        </p>
      </details>
    </form>
  );
}

function TraceDetail({
  detail,
  search,
}: {
  detail: NonNullable<TraceData["detail"]>;
  search: TraceSearch;
}) {
  const item = detail.item;
  return (
    <section className="space-y-6" aria-label="Detalhes da ligação">
      <Link
        to="/trace"
        search={{ ...search, proposal: undefined }}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Voltar às ligações
      </Link>
      {!item ? (
        <p role="status">
          Esta ligação não está mais ativa. O histórico preservado aparece abaixo.
        </p>
      ) : (
        <>
          <div>
            <p className="meta-label">{item.stateLabel}</p>
            <h2 className="mt-2 font-serif text-2xl">{passageLinkLabel(item.payload.passage)}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {item.row.title}
              {item.row.page_index !== null
                ? ` · página física ${item.row.page_index + 1}`
                : " · página indisponível"}
            </p>
          </div>
          <section className="border-l-2 border-primary/40 pl-4">
            <h3 className="font-medium">Por que foi ligado?</h3>
            <p className="mt-1 text-xs text-muted-foreground">{item.originLabel}</p>
            {item.explanation.map((line, index) => (
              <p key={index} className="mt-2 text-sm leading-relaxed">
                {line}
              </p>
            ))}
            <p className="mt-2 text-xs text-muted-foreground">
              Visibilidade não significa verdade teológica nem revisão acadêmica. Confirmação de um
              lote não comprova leitura individual de cada item.
            </p>
          </section>
          {item.evidenceQuotes.length > 0 && (
            <section>
              <h3 className="font-medium">Evidência registrada</h3>
              {item.evidenceQuotes.map((quote, index) => (
                <blockquote
                  key={index}
                  className="mt-2 whitespace-pre-wrap border-l border-border pl-4 text-sm"
                >
                  {quote}
                </blockquote>
              ))}
            </section>
          )}
          <div className="flex flex-wrap gap-3 text-sm">
            {item.row.page_index !== null && (
              <Link
                to="/library/document/$documentId"
                params={{ documentId: item.row.document_id }}
                search={{ page: item.row.page_index + 1 }}
                className="underline underline-offset-4"
              >
                Abrir fonte na página
              </Link>
            )}
            {[item.payload.passage, ...item.payload.additionalPassages].map((passage, index) => (
              <div key={index}>
                {passage.chapter ? (
                  <Link
                    to="/scripture/$book/$chapter"
                    params={{ book: passage.bookId, chapter: String(passage.chapter) }}
                    className="underline underline-offset-4"
                  >
                    {passageLinkLabel(passage)}
                  </Link>
                ) : (
                  <span>{passageLinkLabel(passage)} — alcance de livro</span>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Esquema: {passage.versificationSchemeId}
                </p>
              </div>
            ))}
          </div>
          <details className="border-y border-border py-3">
            <summary className="cursor-pointer text-sm">
              Trecho completo e dados de rastreabilidade
            </summary>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
              {detail.unit?.text ||
                "Texto original indisponível neste workspace. Reimporte o PDF original para recuperar as páginas."}
            </p>
            <dl className="mt-4 space-y-2 break-all text-xs text-muted-foreground">
              <div>
                <dt>Método registrado</dt>
                <dd>{item.row.method}</dd>
              </div>
              <div>
                <dt>Identificador da ligação</dt>
                <dd>{item.row.id}</dd>
              </div>
              <div>
                <dt>SHA-256 do documento</dt>
                <dd>{item.row.checksum}</dd>
              </div>
              {item.row.configuration_key && (
                <div>
                  <dt>Configuração do processamento</dt>
                  <dd>{item.row.configuration_key}</dd>
                </div>
              )}
              <div>
                <dt>Relação / alcance</dt>
                <dd>
                  {
                    { cites: "Cita", discusses: "Discute", "alludes-to": "Alude a" }[
                      item.payload.relationType
                    ]
                  }{" "}
                  / {item.payload.relationScope ?? "Não registrado"}
                </dd>
              </div>
            </dl>
          </details>
        </>
      )}
      <section>
        <h3 className="font-serif text-xl">Histórico da ligação</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Do mais recente para o mais antigo. Registros anteriores à implantação do Rastro não têm
          histórico retroativo.
        </p>
        {detail.events.length ? (
          <ol className="mt-4 space-y-4 border-l border-border pl-4">
            {detail.events.map((event) => (
              <li key={event.id}>
                <p className="text-sm font-medium">{EVENT_LABELS[event.event_kind]}</p>
                <time dateTime={event.occurred_at} className="text-xs text-muted-foreground">
                  {dateLabel(event.occurred_at)}
                </time>
                <p className="mt-1 text-xs">{stateDescription(event.state_json)}</p>
                <details className="mt-1 text-xs text-muted-foreground">
                  <summary className="cursor-pointer">Registro técnico deste evento</summary>
                  <pre className="mt-2 overflow-auto whitespace-pre-wrap break-all">
                    {event.payload_json}
                    {"\n"}
                    {event.state_json}
                  </pre>
                </details>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhum evento preservado para esta ligação.
          </p>
        )}
        {detail.olderEvents && (
          <p className="mt-2 text-xs text-muted-foreground">
            Exibidos os 100 eventos mais recentes. O histórico completo permanece no backup privado.
          </p>
        )}
      </section>
    </section>
  );
}

function TracePage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const research =
    search.view === "research" ||
    (!search.view &&
      !search.proposal &&
      !search.documentId &&
      !search.bookId &&
      !search.chapter &&
      !search.verse &&
      !search.scheme &&
      search.state === "all" &&
      search.offset === 0);
  return (
    <>
      <nav className="trace-mode-nav" aria-label="Modos do Rastro">
        <AppLink
          href={`/trace?view=research${search.q ? `&q=${encodeURIComponent(search.q)}` : ""}`}
          aria-current={research ? "page" : undefined}
        >
          Investigar palavra ou passagem
        </AppLink>
        <AppLink href="/trace?view=history" aria-current={!research ? "page" : undefined}>
          Histórico e proveniência
        </AppLink>
      </nav>
      {research ? (
        <ResearchDossier
          query={search.q ?? ""}
          onQuery={(q) =>
            void navigate({ search: { q, view: "research", state: "all", offset: 0 } })
          }
        />
      ) : (
        <TraceHistory />
      )}
    </>
  );
}

function TraceHistory() {
  const search = Route.useSearch();
  const key = JSON.stringify(search);
  const [state, setState] = useState<{ data?: TraceData; error?: string }>({});
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    let generation = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = () => {
      const request = ++generation;
      const filters: TraceSearch = SearchSchema.parse(JSON.parse(key) as unknown);
      void Promise.all([
        KnowledgeTraceRepository.list(filters),
        KnowledgeTraceRepository.documents(),
        filters.proposal ? KnowledgeTraceService.detail(filters.proposal) : Promise.resolve(null),
      ]).then(
        ([list, documents, detail]) => {
          if (active && request === generation) setState({ data: { list, documents, detail } });
        },
        (cause: unknown) => {
          if (active && request === generation)
            setState({ error: cause instanceof Error ? cause.message : String(cause) });
        },
      );
    };
    setState({});
    load();
    const changed = () => {
      clearTimeout(timer);
      timer = setTimeout(load, 200);
    };
    window.addEventListener("scriptorium:knowledge-changed", changed);
    return () => {
      active = false;
      clearTimeout(timer);
      window.removeEventListener("scriptorium:knowledge-changed", changed);
    };
  }, [key, revision]);
  const items: KnowledgeTraceItem[] = state.data?.list.rows.map(explainKnowledgeTrace) ?? [];
  return (
    <article data-knowledge-trace className="mx-auto w-full max-w-7xl space-y-6 px-5 py-6 md:px-8">
      <PageHeader
        eyebrow="Proveniência do conhecimento privado"
        icon={<GitBranch className="size-5" aria-hidden="true" />}
        title="Rastro"
        description="Do livro à passagem: veja a origem, a justificativa e o que aconteceu com cada ligação real do motor."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRevision((value) => value + 1)}
            aria-label="Atualizar rastro"
          >
            <RefreshCw className="size-4" />
          </Button>
        }
      />
      {!search.proposal && <ContextualReadingImport />}
      {!state.data && !state.error && <p role="status">Carregando registros do workspace…</p>}
      {state.error && (
        <div role="alert" className="space-y-2 text-sm">
          <p>Não foi possível abrir o Rastro: {state.error}</p>
          <Button variant="outline" onClick={() => setRevision((value) => value + 1)}>
            Tentar novamente
          </Button>
        </div>
      )}
      {state.data?.list.persistence === "memory" && (
        <p role="alert" className="border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
          Esta sessão está usando armazenamento temporário. Os resultados não confirmam o estado do
          seu acervo persistente. Verifique a origem do workspace e se outra instância está usando o
          armazenamento; não reimporte seus livros só porque esta lista está vazia.
        </p>
      )}
      {state.data &&
        (state.data.detail ? (
          <TraceDetail detail={state.data.detail} search={search} />
        ) : (
          <>
            <TraceFilters key={key} search={search} documents={state.data.documents} />
            <nav aria-label="Estado das ligações" className="flex flex-wrap gap-2">
              {(
                [
                  { value: "all", label: "Todas" },
                  { value: "visible", label: "Disponíveis na leitura" },
                  { value: "pending", label: "Pendentes" },
                  { value: "blocked", label: "Rejeitadas ou revogadas" },
                ] as const
              ).map((option) => (
                <Link
                  key={option.value}
                  to="/trace"
                  search={{ ...search, state: option.value, offset: 0 }}
                  aria-current={search.state === option.value ? "page" : undefined}
                  className={`rounded border px-3 py-2 text-xs ${search.state === option.value ? "border-primary bg-accent text-foreground" : "border-border text-muted-foreground"}`}
                >
                  {option.label}
                </Link>
              ))}
            </nav>
            <p className="text-xs text-muted-foreground">
              {state.data.documents.length} fontes no workspace · até 40 ligações por página.
              Quantidade não mede qualidade ou cobertura completa.
            </p>
            {items.length ? (
              <ul className="divide-y divide-border border-y border-border">
                {items.map((item) => (
                  <li key={item.row.id}>
                    <Link
                      to="/trace"
                      search={{ ...search, proposal: item.row.id }}
                      className="block space-y-1 py-4 hover:bg-accent/30 focus-visible:outline focus-visible:outline-ring"
                    >
                      <div className="flex flex-wrap justify-between gap-2">
                        <span className="font-serif text-lg">
                          {passageLinkLabel(item.payload.passage)}
                        </span>
                        <span className="text-xs text-muted-foreground">{item.stateLabel}</span>
                      </div>
                      <p className="break-words text-sm">
                        {item.row.title}
                        {item.row.page_index !== null ? ` · p. ${item.row.page_index + 1}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.originLabel} · esquema {item.payload.passage.versificationSchemeId}
                        {item.payload.additionalPassages.length
                          ? ` · +${item.payload.additionalPassages.length} destinos`
                          : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">Ver evidência e histórico →</p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div role="status">
                <EmptyState
                  title="Nenhuma ligação neste recorte"
                  action={
                    <Link
                      to="/library"
                      className="inline-flex h-9 items-center rounded-md border border-input px-3 text-sm hover:bg-accent"
                    >
                      Abrir a Biblioteca
                    </Link>
                  }
                >
                  Um livro importado ainda pode não ter ligações. Ajuste os filtros ou veja o
                  “Processamento” na Biblioteca; o Rastro não inventa conteúdo para preencher
                  lacunas.
                </EmptyState>
              </div>
            )}
            <nav aria-label="Paginação do rastro" className="flex justify-between gap-4">
              {search.offset > 0 ? (
                <Link
                  to="/trace"
                  search={{ ...search, offset: Math.max(0, search.offset - 40) }}
                  className="text-sm underline"
                >
                  Anterior
                </Link>
              ) : (
                <span />
              )}
              {state.data.list.hasMore && (
                <Link
                  to="/trace"
                  search={{ ...search, offset: search.offset + 40 }}
                  className="text-sm underline"
                >
                  Próxima página
                </Link>
              )}
            </nav>
          </>
        ))}
    </article>
  );
}
