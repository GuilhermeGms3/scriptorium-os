import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BookmarkPlus, ExternalLink, Search, X } from "lucide-react";
import { Button } from "../ui/button";
import { HebrewSearchMark } from "./hebrew-search-mark";
import { AcademicSearchService } from "../../lib/application/academic-search-service";
import { AcademicReferenceService } from "../../lib/application/academic-reference-service";
import { externalResearchLinks } from "../../lib/application/external-research-links";
import {
  AcademicQuerySchema,
  type AcademicQuery,
  type AcademicResult,
  type AcademicSearchPage,
} from "../../lib/domain/academic-search";
import { useSourceReader } from "../study/source-reader-context";
import { errorMessage } from "../../lib/utils";

export function ExternalResearchPanel({
  kind,
  query,
  onQuery,
}: {
  kind: "academic" | "web";
  query: string;
  onQuery: (value: string) => void;
}) {
  const [language, setLanguage] = useState<AcademicQuery["language"]>("all");
  const [openOnly, setOpenOnly] = useState(false);
  const [fromYear, setFromYear] = useState("");
  const [toYear, setToYear] = useState("");
  const [result, setResult] = useState<{ data: AcademicSearchPage; query: AcademicQuery }>();
  const [webQuery, setWebQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [cycle, setCycle] = useState(0);
  const requestStateRef = useRef<{ pending: AbortController | null; generation: number }>({
    pending: null,
    generation: 0,
  });
  const requestState = requestStateRef.current;
  useEffect(() => {
    requestState.generation++;
    requestState.pending?.abort();
    requestState.pending = null;
    setBusy(false);
    setResult(undefined);
    setWebQuery("");
    setError(undefined);
    return () => {
      requestState.generation++;
      requestState.pending?.abort();
    };
  }, [query, language, openOnly, fromYear, toYear, kind, requestState]);

  async function search(page = 1) {
    setError(undefined);
    const parsed = AcademicQuerySchema.safeParse({
      query,
      language,
      openAccessOnly: openOnly,
      ...(fromYear ? { fromYear: Number(fromYear) } : {}),
      ...(toYear ? { toYear: Number(toYear) } : {}),
      page,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Confira os filtros da pesquisa.");
      return;
    }
    setCycle((value) => value + 1);
    if (kind === "web") {
      setWebQuery(parsed.data.query);
      return;
    }
    requestState.pending?.abort();
    const controller = new AbortController();
    requestState.pending = controller;
    const token = ++requestState.generation;
    setBusy(true);
    setResult(undefined);
    try {
      const data = await AcademicSearchService.search(parsed.data, controller.signal);
      if (token === requestState.generation) setResult({ data, query: parsed.data });
    } catch (cause) {
      if (token === requestState.generation && !controller.signal.aborted)
        setError(errorMessage(cause));
    } finally {
      if (token === requestState.generation) {
        setBusy(false);
        requestState.pending = null;
      }
    }
  }
  const links = externalResearchLinks(kind === "web" ? webQuery : query);
  return (
    <section
      className="search-external-panel"
      aria-label={kind === "academic" ? "Pesquisa acadêmica externa" : "Pesquisa na internet"}
    >
      <div className="search-scope-caption">
        <span>{kind === "academic" ? "Além do acervo · OpenAlex" : "Abrir novas fontes"}</span>
        <p>
          {kind === "academic"
            ? "Consulte registros acadêmicos reais. Encontrar uma referência não significa que o texto integral esteja instalado ou revisado."
            : "Estes caminhos abrem os sites originais em outra aba. Não são resultados baixados nem conteúdo já conferido pelo Scriptorium."}
        </p>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
        className="flex flex-col gap-4"
      >
        <label className="search-atlas-input">
          <Search className="size-4 shrink-0" aria-hidden="true" />
          <span className="sr-only">Tema da pesquisa externa</span>
          <input
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            maxLength={240}
            placeholder="Ex.: hermenêutica bíblica, arqueologia de Jerusalém…"
          />
        </label>
        {kind === "academic" && (
          <fieldset className="search-external-filters">
            <legend className="sr-only">Filtros acadêmicos</legend>
            <label>
              Idioma
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value as AcademicQuery["language"])}
              >
                <option value="all">Todos os idiomas</option>
                <option value="pt">Português</option>
                <option value="en">Inglês</option>
                <option value="es">Espanhol</option>
              </select>
            </label>
            <label>
              De
              <input
                type="number"
                aria-label="Ano inicial"
                min="1000"
                max="3000"
                placeholder="Ano"
                value={fromYear}
                onChange={(event) => setFromYear(event.target.value)}
              />
            </label>
            <label>
              Até
              <input
                type="number"
                aria-label="Ano final"
                min="1000"
                max="3000"
                placeholder="Ano"
                value={toYear}
                onChange={(event) => setToYear(event.target.value)}
              />
            </label>
            <label className="search-open-access">
              <input
                type="checkbox"
                checked={openOnly}
                onChange={(event) => setOpenOnly(event.target.checked)}
              />
              Apenas acesso aberto informado
            </label>
          </fieldset>
        )}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            <Button type="submit" disabled={busy || query.trim().length < 2}>
              <Search data-icon="inline-start" />
              {kind === "academic" ? "Pesquisar fontes" : "Mostrar caminhos na web"}
            </Button>
            {busy && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  requestState.generation++;
                  requestState.pending?.abort();
                  requestState.pending = null;
                  setBusy(false);
                }}
              >
                <X data-icon="inline-start" />
                Cancelar
              </Button>
            )}
          </div>
          <HebrewSearchMark
            active={busy}
            label={
              busy
                ? "Consultando o catálogo acadêmico…"
                : result
                  ? "Consulta concluída"
                  : webQuery
                    ? "Caminhos prontos para explorar"
                    : "A pesquisa externa só acontece por sua ação"
            }
            cycle={cycle}
          />
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Somente o tema e os filtros são enviados ao provedor consultado. Livros, notas e trechos
          privados não acompanham a pesquisa.
        </p>
      </form>
      {error && (
        <div
          role="alert"
          className="mt-5 border-l-2 border-destructive pl-4 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      {result && (
        <div className="mt-7" aria-busy={busy}>
          <div className="search-results-heading">
            <h2>Fontes encontradas</h2>
            <p>
              {result.data.total.toLocaleString("pt-BR")} registros no catálogo · página{" "}
              {result.data.page}
            </p>
          </div>
          {result.data.skipped > 0 && (
            <p className="mb-4 text-xs text-muted-foreground">
              {result.data.skipped} registro(s) incompleto(s) foram omitidos.
            </p>
          )}
          {!result.data.items.length ? (
            <p className="py-6 text-sm text-muted-foreground">
              Nenhuma fonte encontrada com estes filtros. Tente menos termos, outro idioma ou os
              caminhos externos abaixo.
            </p>
          ) : (
            <ol className="search-academic-results">
              {result.data.items.map((item) => (
                <AcademicResultRow key={item.id} item={item} />
              ))}
            </ol>
          )}
          <nav
            className="mt-5 flex flex-wrap items-center justify-between gap-3"
            aria-label="Páginas de resultados acadêmicos"
          >
            <Button
              variant="outline"
              disabled={busy || result.data.page === 1}
              onClick={() => void search(result.data.page - 1)}
            >
              <ArrowLeft data-icon="inline-start" />
              Anterior
            </Button>
            <span className="text-xs text-muted-foreground">
              Até 10 páginas por pesquisa · relevância não é validação acadêmica
            </span>
            <Button
              variant="outline"
              disabled={
                busy ||
                result.data.page >= 10 ||
                result.data.page * result.data.perPage >= result.data.total
              }
              onClick={() => void search(result.data.page + 1)}
            >
              Próxima
              <ArrowRight data-icon="inline-end" />
            </Button>
          </nav>
        </div>
      )}
      {links.length > 0 && (kind === "web" || error || result) && (
        <section className="search-external-paths" aria-label="Caminhos de pesquisa externa">
          <div className="search-results-heading">
            <h2>{kind === "web" ? "Escolha onde continuar" : "Ampliar esta investigação"}</h2>
            <p>Atalhos de pesquisa, não resultados integrados</p>
          </div>
          <ul>
            {links.map((link) => (
              <li key={link.id}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                >
                  <span>
                    {link.title}
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                  </span>
                  <small>{link.description}</small>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      {!result && !error && !busy && !webQuery && (
        <div className="search-research-intro">
          <h2>
            {kind === "academic"
              ? "A investigação continua além da sua estante"
              : "Mais de um caminho para a mesma pergunta"}
          </h2>
          <p>
            {kind === "academic"
              ? "Busque um tema e refine por idioma, período ou acesso aberto. Você poderá guardar uma referência na Biblioteca e anotar sobre ela, sem baixar ou publicar o documento automaticamente."
              : "Prepare uma pesquisa e escolha Google, Google Acadêmico, SciELO, BDTD ou bibliotecas universitárias. Cada caminho mantém a sua pergunta e identifica o destino."}
          </p>
        </div>
      )}
    </section>
  );
}

function AcademicResultRow({ item }: { item: AcademicResult }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ sourceId: string; existing: boolean }>();
  const [error, setError] = useState<string>();
  const openSource = useSourceReader();
  const typeLabels: Record<string, string> = {
    article: "Artigo",
    book: "Livro",
    "book-chapter": "Capítulo",
    dissertation: "Tese / dissertação",
    review: "Revisão",
    preprint: "Preprint",
    report: "Relatório",
    reference_entry: "Verbete",
  };
  return (
    <li className="search-academic-result">
      <div className="search-result-branch" aria-hidden="true" />
      <div className="min-w-0">
        <p className="meta-label">
          {typeLabels[item.publicationType] ?? "Publicação"} · {item.year ?? "Ano não informado"} ·{" "}
          {item.language?.toUpperCase() ?? "Idioma não informado"}
        </p>
        <h3>
          <a
            href={item.originalUrl ?? item.url}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
          >
            {item.title}
            <ExternalLink className="ml-2 inline size-3.5" aria-hidden="true" />
          </a>
        </h3>
        <p className="mt-2 text-sm">{item.authors.join("; ") || "Autoria não informada"}</p>
        {(item.venue || item.institutions.length > 0) && (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {[item.venue, ...item.institutions].filter(Boolean).join(" · ")}
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          {item.openAccess
            ? "Acesso aberto informado pelo catálogo"
            : "Acesso ao texto não confirmado"}{" "}
          · Metadados via {item.provider}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            disabled={saving || Boolean(saved)}
            onClick={async () => {
              setSaving(true);
              setError(undefined);
              try {
                setSaved(await AcademicReferenceService.save(item));
              } catch (cause) {
                setError(errorMessage(cause));
              } finally {
                setSaving(false);
              }
            }}
          >
            <BookmarkPlus data-icon="inline-start" />
            {saving
              ? "Guardando…"
              : saved
                ? saved.existing
                  ? "Já na Biblioteca"
                  : "Referência guardada"
                : "Guardar referência"}
          </Button>
          {item.openAccessUrl && (
            <a
              className="text-xs text-primary underline underline-offset-4"
              href={item.openAccessUrl}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
            >
              Abrir acesso informado
            </a>
          )}
          <a
            className="text-xs text-primary underline underline-offset-4"
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
          >
            Ficha no OpenAlex
          </a>
          {saved && (
            <>
              <Link
                to="/library"
                search={{ source: saved.sourceId }}
                className="text-xs text-primary underline"
              >
                Ver na Biblioteca
              </Link>
              <Button
                size="sm"
                variant="link"
                onClick={() =>
                  openSource({
                    source: { kind: "bibliographic", sourceId: saved.sourceId, title: item.title },
                    externalUrl: item.originalUrl ?? item.url,
                    context:
                      "Referência encontrada no OpenAlex. Metadados externos, sem texto integral ou revisão atribuída pelo Scriptorium.",
                  })
                }
              >
                Anotar sobre esta fonte
              </Button>
            </>
          )}
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </li>
  );
}
