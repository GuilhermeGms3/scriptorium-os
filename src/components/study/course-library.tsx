import {
  DOCUMENT_PROFILE_LABELS,
  type DocumentProfileKind,
} from "../../lib/domain/document-profile";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type { CourseModule, StudyCourse } from "../../lib/domain/study-course";
import type { NoteLink } from "../../lib/domain/study";
import { StudyLibraryRepository } from "../../lib/repositories/study-library-repository";
import { loadCourseReadings } from "../../lib/application/study-course-materials";
import { useWorkspaceQuery } from "../../hooks/use-workspace-query";
import { useSourceReader } from "./source-reader-context";
import { Button } from "../ui/button";

export function CourseLibraryInventory() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);
  const query = useWorkspaceQuery(
    ["course-library-inventory"],
    () => StudyLibraryRepository.inventory(),
    { enabled: open, refreshOnKnowledgeChange: true },
  );
  const items =
    query.data?.filter((item) =>
      `${item.title} ${item.authors.join(" ")}`
        .toLocaleLowerCase("pt-BR")
        .includes(filter.toLocaleLowerCase("pt-BR")),
    ) ?? [];
  return (
    <details
      className="course-inventory"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        Conferir a preparação dos meus livros {query.data ? `(${query.data.length})` : ""}
      </summary>
      <p>
        Importação, extração, estrutura e análise são estados diferentes. Os dados abaixo descrevem
        o processamento registrado, sem afirmar leitura acadêmica integral dos livros.
      </p>
      {query.isPending && <p role="status">Consultando o acervo…</p>}
      {query.isError && (
        <p role="alert">
          Acervo indisponível.{" "}
          <button onClick={() => void query.refetch()}>Tentar novamente</button>
        </p>
      )}
      {query.data && (
        <>
          <label>
            Filtrar livros
            <input
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value);
                setPage(0);
              }}
              placeholder="Título ou autor"
            />
          </label>
          <ul>
            {items.slice(page * 8, page * 8 + 8).map((item) => (
              <li key={item.id}>
                <Link to="/library/document/$documentId" params={{ documentId: item.id }}>
                  {item.title}
                </Link>
                <small>
                  {item.authors.length
                    ? item.authors.join(" · ")
                    : "Autoria não identificada no cadastro"}{" "}
                  · {item.textPages}/{item.pages} páginas com texto · {item.nodes} nós estruturais ·{" "}
                  {item.units} unidades ·{" "}
                  {item.analysisStatus === "ready"
                    ? "Indexação registrada como pronta"
                    : "Indexação ainda incompleta ou ausente"}
                </small>
                <small>
                  Classificação registrada:{" "}
                  {DOCUMENT_PROFILE_LABELS[item.profile as DocumentProfileKind] ?? item.profile} ·{" "}
                  {item.profileReviewed ? "conferida" : "automática ou não conferida"}
                </small>
              </li>
            ))}
          </ul>
          {!items.length && <p>Nenhum livro corresponde ao filtro.</p>}
          <div className="topic-pager">
            <Button variant="ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>
              Anterior
            </Button>
            <Button
              variant="ghost"
              disabled={(page + 1) * 8 >= items.length}
              onClick={() => setPage(page + 1)}
            >
              Próximos livros
            </Button>
          </div>
        </>
      )}
    </details>
  );
}

export function CoursePrivateReadings({
  module,
  links,
  studyId,
}: {
  module: CourseModule;
  links: NoteLink[];
  studyId?: string;
}) {
  const query = useWorkspaceQuery(
    ["course-private-readings", module.id, module.passages],
    () => loadCourseReadings(module),
    { refreshOnKnowledgeChange: true },
  );
  const [index, setIndex] = useState(0);
  const [documentId, setDocumentId] = useState("");
  const openSource = useSourceReader();
  if (query.isPending)
    return <p role="status">Reunindo as unidades citáveis ligadas às passagens deste módulo…</p>;
  if (query.isError)
    return (
      <p role="alert">
        Não foi possível consultar as fontes.{" "}
        <button onClick={() => void query.refetch()}>Tentar novamente</button>
      </p>
    );
  const allReadings = query.data?.readings ?? [];
  const books = [
    ...new Map(allReadings.map(({ item }) => [item.document.id, item.document])).values(),
  ];
  const activeDocument = books.find((book) => book.id === documentId) ?? books[0];
  const readings = allReadings.filter((reading) => reading.item.document.id === activeDocument?.id);
  const selected = Math.min(index, Math.max(0, readings.length - 1));
  const current = readings[selected];
  return (
    <section className="course-private-readings" aria-label="Leituras dos meus livros">
      <p className="meta-label">Aprofundamento no acervo privado</p>
      <h2>Leituras ligadas ao módulo</h2>
      <p className="course-purpose">
        Unidades selecionadas por vínculos de passagem e análise contextual registrados. A seleção
        organiza a leitura; o estado de conferência de cada fonte permanece explícito.
      </p>
      {query.data?.incomplete && (
        <p role="status">
          A consulta ao acervo está incompleta; as aulas e fontes externas permanecem disponíveis.
        </p>
      )}
      {current ? (
        <>
          <label>
            Escolher obra
            <select
              className="topic-reading-select"
              value={activeDocument?.id ?? ""}
              onChange={(event) => {
                setDocumentId(event.target.value);
                setIndex(0);
              }}
            >
              {books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title}
                </option>
              ))}
            </select>
          </label>
          <nav className="course-source-sections" aria-label="Trechos desta obra">
            {readings
              .slice(Math.floor(selected / 4) * 4, Math.floor(selected / 4) * 4 + 4)
              .map(({ item }, offset) => {
                const position = Math.floor(selected / 4) * 4 + offset;
                return (
                  <button
                    key={item.unit.id}
                    type="button"
                    aria-current={position === selected ? "true" : undefined}
                    onClick={() => setIndex(position)}
                  >
                    {item.passageRelation.payload.contextualAnalysis?.title ??
                      item.context.sectionTitle ??
                      "Trecho da obra"}
                    <small>Página {item.pages.map((page) => page + 1).join(", ")}</small>
                  </button>
                );
              })}
          </nav>
          <article className="course-source-reading">
            <p className="course-purpose">{current.purpose}</p>
            <h3>
              {current.item.passageRelation.payload.contextualAnalysis?.title ??
                current.item.context.sectionTitle ??
                current.item.document.title}
            </h3>
            <p className="course-source-locator">
              {current.item.context.authors.join(" · ") || "Autoria não informada no cadastro"} ·{" "}
              {current.item.document.title} · páginas físicas{" "}
              {current.item.pages.map((p) => p + 1).join(", ")} ·{" "}
              {current.item.reviewState === "confirmed"
                ? "vínculo conferido individualmente"
                : "vínculo publicado pelo processamento do acervo"}
            </p>
            <blockquote className="course-original-source" lang={current.item.document.language}>
              {current.item.unit.text}
            </blockquote>
            <details>
              <summary>Origem e razão da ligação</summary>
              <p>{current.item.passageRelation.payload.contextualAnalysis?.rationale}</p>
              <p>
                Unidade {current.item.unit.id} · {current.item.unit.method}. Uma associação
                publicada não comprova a conclusão do autor.
              </p>
            </details>
            <Button
              variant="outline"
              onClick={() =>
                openSource({
                  source: {
                    kind: "private-document",
                    documentId: current.item.document.id,
                    unitId: current.item.unit.id,
                    title: current.item.document.title,
                    page: (current.item.pages[0] ?? 0) + 1,
                  },
                  links,
                  context: `Leitura do módulo ${module.title}`,
                  ...(studyId ? { studyId } : {}),
                })
              }
            >
              Ler o contexto e anotar
            </Button>
          </article>
          <div className="topic-pager">
            <Button
              variant="ghost"
              disabled={selected === 0}
              onClick={() => setIndex(selected - 1)}
            >
              Trecho anterior
            </Button>
            <span>
              {selected + 1} de {readings.length}
            </span>
            <Button
              variant="ghost"
              disabled={selected === readings.length - 1}
              onClick={() => setIndex(selected + 1)}
            >
              Próximo trecho
            </Button>
          </div>
        </>
      ) : (
        <p className="course-empty-source">
          Ainda não há unidade com análise contextual e vínculo pertinente disponível para este
          módulo neste workspace. A ocorrência de uma palavra no PDF não é usada como substituto. As
          leituras bíblicas e referências externas do curso continuam disponíveis.
        </p>
      )}
    </section>
  );
}

export function CourseExternalReferences({
  course,
  module,
}: {
  course: StudyCourse;
  module: CourseModule;
}) {
  const ids = new Set(
    module.lessons.flatMap((lesson) => lesson.sections.flatMap((section) => section.references)),
  );
  const refs = course.references.filter((reference) => ids.has(reference.id));
  return (
    <section className="course-external">
      <h2>Fontes para esta etapa</h2>
      {refs.length ? (
        <ul>
          {refs.map((reference) => (
            <li key={reference.id}>
              <a href={reference.url} target="_blank" rel="noreferrer">
                {reference.title} ↗
              </a>
              <p>{reference.perspective}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p>
          A fonte principal desta etapa é a passagem bíblica indicada. Outras fontes utilizadas
          aparecem nas aulas e nos módulos de aprofundamento.
        </p>
      )}
    </section>
  );
}
