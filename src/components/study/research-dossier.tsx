import { morphologyLabel } from "../../lib/i18n";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, Search } from "lucide-react";
import { useWorkspaceQuery } from "../../hooks/use-workspace-query";
import { loadResearchDossier } from "../../lib/application/research-dossier-service";
import type { PassageRef } from "../../lib/domain/scripture";
import type { CourseLesson, StudyCourse } from "../../lib/domain/study-course";
import type { WorkspacePassageKnowledgeLayer } from "../../lib/domain/workspace-passage-knowledge";
import { bookLabel } from "../../lib/i18n";
import { GENESIS_COURSE } from "../../lib/content/study-courses/genesis";
import { CoursePassageReading } from "./course-passages";
import { CourseLibraryInventory } from "./course-library";
import { useSourceReader } from "./source-reader-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Button } from "../ui/button";

function DossierEssay({ lesson, course }: { lesson: CourseLesson; course: StudyCourse }) {
  return (
    <article className="course-lesson dossier-essay">
      <h2>{lesson.title}</h2>
      {lesson.sections.map((section, index) => (
        <section className={`course-section course-section-${section.kind}`} key={index}>
          <h3>{section.title}</h3>
          {section.paragraphs.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
          {section.references.length > 0 && (
            <details className="course-citations">
              <summary>Conferir as fontes</summary>
              <ul>
                {section.references
                  .map((id) => course.references.find((ref) => ref.id === id))
                  .filter((ref) => ref !== undefined)
                  .map((ref) => (
                    <li key={ref.id}>
                      <a href={ref.url} target="_blank" rel="noreferrer">
                        {ref.title} ↗
                      </a>
                      <small>{ref.perspective}</small>
                    </li>
                  ))}
              </ul>
            </details>
          )}
        </section>
      ))}
    </article>
  );
}

function DossierEvidence({
  layer,
  ref,
}: {
  layer: WorkspacePassageKnowledgeLayer | null;
  ref: PassageRef;
}) {
  const [page, setPage] = useState(0);
  const openSource = useSourceReader();
  const items =
    layer?.items.filter(
      (item) => item.passageRelation.payload.contextualAnalysis && item.reviewState !== "pending",
    ) ?? [];
  if (!items.length)
    return (
      <p>
        Não há explicação contextual publicada ligada a esta passagem no acervo disponível.
        Referências detectadas sem análise não são apresentadas como comentários.
      </p>
    );
  return (
    <section className="dossier-evidence">
      <h2>O que os seus livros dizem</h2>
      <p>
        {items.length} unidades com contexto registrado. Abra uma fonte por vez para conferir o
        original.
      </p>
      {items.slice(page * 5, page * 5 + 5).map((item) => (
        <details key={item.id}>
          <summary>
            {item.document.title} · p. {item.pages.map((p) => p + 1).join(", ")}
          </summary>
          <p className="course-source-locator">
            {item.context.authors.join(" · ") || "Autoria não cadastrada"} ·{" "}
            {item.reviewState === "confirmed"
              ? "Ligação conferida individualmente"
              : "Ligação publicada pelo pipeline"}{" "}
            ·{" "}
            {item.passageRelation.payload.referenceRole === "lexical-mention"
              ? "Menção lexical"
              : item.passageRelation.payload.referenceRole === "intertextual"
                ? "Comparação intertextual"
                : item.passageRelation.payload.referenceRole === "proof-text"
                  ? "Uso como texto-prova"
                  : "Comentário ou contexto registrado"}
          </p>
          <p>{item.passageRelation.payload.contextualAnalysis?.rationale}</p>
          <blockquote className="course-original-source">{item.unit.text}</blockquote>
          <div className="course-source-actions">
            <Button
              variant="outline"
              onClick={() =>
                openSource({
                  source: {
                    kind: "private-document",
                    documentId: item.document.id,
                    unitId: item.unit.id,
                    title: item.document.title,
                    page: (item.pages[0] ?? 0) + 1,
                  },
                  context: "Pesquisa no Rastro",
                  links: [
                    {
                      kind: "passage",
                      target: JSON.stringify(ref),
                      label: `${bookLabel(ref.bookId)} ${ref.chapter}`,
                    },
                  ],
                })
              }
            >
              Abrir o contexto e anotar
            </Button>
            <Link
              to="/trace"
              search={{ state: "all", offset: 0, proposal: item.id, view: "history" }}
            >
              Conferir histórico desta ligação →
            </Link>
          </div>
        </details>
      ))}
      <div className="topic-pager">
        <Button variant="ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>
          Anteriores
        </Button>
        <Button
          variant="ghost"
          disabled={(page + 1) * 5 >= items.length}
          onClick={() => setPage(page + 1)}
        >
          Próximas fontes
        </Button>
      </div>
    </section>
  );
}

export function ResearchDossier({
  query,
  onQuery,
}: {
  query: string;
  onQuery: (query: string) => void;
}) {
  const [input, setInput] = useState(query);
  const [chosen, setChosen] = useState<PassageRef>();
  const [tokenId, setTokenId] = useState<string>();
  useEffect(() => {
    setInput(query);
    setChosen(undefined);
    setTokenId(undefined);
  }, [query]);
  const result = useWorkspaceQuery(
    ["research-dossier", query, chosen, tokenId],
    () => loadResearchDossier(query, chosen, tokenId),
    { enabled: Boolean(query), refreshOnKnowledgeChange: true },
  );
  const data = result.data?.kind === "dossier" ? result.data : null;
  const genesis = data?.ref.bookId === "genesis" && data.ref.chapter === 1;
  const label = data
    ? `${bookLabel(data.ref.bookId)} ${data.ref.chapter}${data.ref.verseStart ? `:${data.ref.verseStart}` : ""}`
    : "";
  const originals =
    data?.originals.filter((token) => token.ref.verseStart === (data.ref.verseStart ?? 1)) ?? [];
  const word = data?.word;
  return (
    <article className="topic-workspace dossier-workspace">
      <header className="topic-header">
        <div>
          <p className="meta-label">Rastro · dossiê de investigação</p>
          <h1>Da palavra ao contexto</h1>
          <p>
            Examine texto, linguagem, história e interpretações, mantendo cada explicação ligada à
            sua origem.
          </p>
        </div>
      </header>
      <form
        className="dossier-search"
        onSubmit={(event) => {
          event.preventDefault();
          if (input.trim()) {
            setChosen(undefined);
            setTokenId(undefined);
            onQuery(input.trim());
          }
        }}
      >
        <label htmlFor="dossier-query">Palavra, passagem ou palavra @ passagem</label>
        <div>
          <input
            id="dossier-query"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            maxLength={500}
            placeholder="Bereshit, Gênesis 1:1 ou Logos @ João 1:1"
          />
          <Button type="submit" disabled={!input.trim()}>
            <Search className="mr-2 size-4" />
            Investigar
          </Button>
        </div>
      </form>
      {!query && (
        <section className="dossier-start">
          <BookOpen className="size-8" />
          <h2>Comece por uma ocorrência concreta</h2>
          <p>
            Bereshit abre o dossiê de Gênesis 1:1. Uma palavra sem passagem pode retornar
            ocorrências para você escolher o contexto. Há um aprofundamento editorial de Gênesis 1,
            além dos dados disponíveis nos corpora e no acervo.
          </p>
          <button type="button" onClick={() => onQuery("Bereshit")}>
            Investigar Bereshit →
          </button>
        </section>
      )}
      {query && result.isPending && (
        <p role="status">Reunindo passagem, análise linguística e fontes do acervo…</p>
      )}
      {result.isError && (
        <p role="alert">
          Não foi possível abrir a pesquisa.{" "}
          <button className="underline" onClick={() => void result.refetch()}>
            Tentar novamente
          </button>
        </p>
      )}
      {result.data?.kind === "choices" && (
        <section className="dossier-choices">
          <h2>Escolha a ocorrência que deseja investigar</h2>
          {result.data.hits.length ? (
            result.data.hits.map((hit) => {
              const address = hit.textUnit.address;
              return address?.bookId && address.chapter ? (
                <button
                  type="button"
                  key={hit.textUnit.id}
                  onClick={() => {
                    setTokenId(undefined);
                    setChosen({
                      bookId: address.bookId!,
                      chapter: address.chapter!,
                      versificationSchemeId: address.versificationSchemeId,
                      ...(address.verseStart ? { verseStart: address.verseStart } : {}),
                      ...(address.verseEnd ? { verseEnd: address.verseEnd } : {}),
                    });
                  }}
                >
                  <strong>
                    {bookLabel(address.bookId)} {address.chapter}:{address.verseStart ?? 1}
                  </strong>
                  <span>{hit.textUnit.text}</span>
                </button>
              ) : null;
            })
          ) : (
            <p>
              Nenhuma ocorrência encontrada. Informe uma passagem, por exemplo “Gênesis 1:1”, ou uma
              palavra acompanhada de “@ passagem”.
            </p>
          )}
        </section>
      )}
      {data && (
        <>
          <div className="course-module-heading">
            <p className="meta-label">Objeto da pesquisa</p>
            <h2>{word?.token.surface ?? label}</h2>
            <p>
              {label} · {data.bundle.texts[0]?.edition.title ?? "Edição identificada nas leituras"}
            </p>
          </div>
          {data.privateUnavailable && (
            <p role="status">
              O acervo privado está indisponível; o texto e os dados públicos continuam acessíveis.
            </p>
          )}
          <Tabs
            defaultValue={word ? "language" : "text"}
            key={`${query}:${chosen ? JSON.stringify(chosen) : ""}`}
          >
            <div className="topic-tabs-scroll">
              <TabsList
                className="topic-tabs h-auto w-max min-w-full justify-start gap-1 rounded-none bg-transparent p-0"
                aria-label="Dimensões da investigação"
              >
                {[
                  ["text", "Texto"],
                  ["language", "Linguagem"],
                  ["context", "História e cultura"],
                  ["interpretations", "Interpretações"],
                  ["sources", "Fontes e proveniência"],
                ].map(([id, title]) => (
                  <TabsTrigger key={id} value={id!}>
                    {title}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <TabsContent value="text" className="topic-tab-content">
              <CoursePassageReading
                passage={{
                  id: "dossier",
                  label,
                  purpose: "Ler a ocorrência no texto e conferir a edição utilizada.",
                  ref: data.ref,
                }}
              />
              {genesis && (
                <DossierEssay
                  lesson={GENESIS_COURSE.modules[2]!.lessons[1]!}
                  course={GENESIS_COURSE}
                />
              )}
              <Link
                to="/scripture/$book/$chapter"
                params={{ book: data.ref.bookId, chapter: String(data.ref.chapter) }}
              >
                Continuar nas Escrituras →
              </Link>
            </TabsContent>
            <TabsContent value="language" className="topic-tab-content">
              <section className="dossier-language">
                <h2>Palavras do versículo {data.ref.verseStart ?? 1}</h2>
                <p>
                  Selecione a forma no original. As análises e ocorrências pertencem ao corpus
                  identificado.
                </p>
                <div className="dossier-token-rail">
                  {originals.map((token) => (
                    <button
                      type="button"
                      key={token.id}
                      aria-pressed={word?.token.id === token.id}
                      onClick={() => setTokenId(token.id)}
                    >
                      {token.surface}
                    </button>
                  ))}
                </div>
                {!originals.length && (
                  <p>Não há tokens do original disponíveis para esta ocorrência.</p>
                )}
                {data.wordError && (
                  <p role="alert">
                    A análise desta palavra não pôde ser carregada.{" "}
                    <button onClick={() => void result.refetch()}>Tentar novamente</button>
                  </p>
                )}
                {word && (
                  <>
                    <h3 className="original-text">{word.token.surface}</h3>
                    <p>
                      {word.token.transliteration
                        ? `Transliteração: ${word.token.transliteration} · `
                        : ""}
                      Edição:{" "}
                      {data.bundle.passage.editions.find(
                        (edition) => edition.id === word.token.editionId,
                      )?.title ?? word.token.editionId}
                    </p>
                    {word.morphology.status === "available" ? (
                      <dl>
                        {word.morphology.data.map((analysis, index) => (
                          <div key={index}>
                            <dt>Análise morfológica</dt>
                            <dd>
                              {analysis.rawMorphologyCode} ·{" "}
                              {analysis.status === "parsed"
                                ? "análise estruturada"
                                : "código ainda não interpretado"}
                            </dd>
                            {Object.entries(analysis.features)
                              .filter(([, value]) => value)
                              .map(([key, value]) => (
                                <div key={key}>
                                  <dt>
                                    {(
                                      {
                                        partOfSpeech: "Classe gramatical",
                                        gender: "Gênero",
                                        number: "Número",
                                        person: "Pessoa",
                                        state: "Estado",
                                        stem: "Tema verbal",
                                        tense: "Tempo",
                                        voice: "Voz",
                                        mood: "Modo",
                                        case: "Caso",
                                      } as Record<string, string>
                                    )[key] ?? key}
                                  </dt>
                                  <dd>{morphologyLabel(String(value))}</dd>
                                </div>
                              ))}
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <p>Morfologia não disponível para esta palavra.</p>
                    )}
                    {word.dictionary.status === "available" ? (
                      word.dictionary.data.map((entry) => (
                        <article key={entry.id}>
                          <h4>{entry.lemma}</h4>
                          <p>{entry.gloss}</p>
                          {entry.definition && <p>{entry.definition}</p>}
                          <details className="course-citations">
                            <summary>Identificação da fonte lexical</summary>
                            <p>
                              {word.sources.references.find(
                                (source) => source.id === entry.sourceId,
                              )?.work ?? entry.sourceId}
                            </p>
                            <p>
                              Idioma do verbete: {entry.language}. Os termos originais da fonte são
                              preservados.
                            </p>
                          </details>
                        </article>
                      ))
                    ) : (
                      <p>
                        O corpus não disponibiliza definição lexical extensa para esta palavra. A
                        análise linguística não é substituída por uma definição inventada.
                      </p>
                    )}
                    {word.concordance.status === "available" && (
                      <details>
                        <summary>
                          Ocorrências da identidade lexical consultada (
                          {word.concordance.data.total})
                        </summary>
                        <p>
                          Exibindo até {word.concordance.data.items.length} ocorrências desta
                          consulta.
                        </p>
                        <ul>
                          {word.concordance.data.items.map((item) => (
                            <li key={item.tokenId}>
                              <Link
                                to="/scripture/$book/$chapter"
                                params={{
                                  book: item.ref.bookId,
                                  chapter: String(item.ref.chapter),
                                }}
                                hash={`verse-${item.ref.verseStart ?? 1}`}
                              >
                                {bookLabel(item.ref.bookId)} {item.ref.chapter}:
                                {item.ref.verseStart ?? 1}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </>
                )}
              </section>
              {genesis && (
                <DossierEssay
                  lesson={GENESIS_COURSE.modules[2]!.lessons[0]!}
                  course={GENESIS_COURSE}
                />
              )}
            </TabsContent>
            <TabsContent value="context" className="topic-tab-content">
              {genesis ? (
                <>
                  <DossierEssay
                    lesson={GENESIS_COURSE.modules[3]!.lessons[0]!}
                    course={GENESIS_COURSE}
                  />
                  <details className="course-citations">
                    <summary>Aprofundar cosmologia e perguntas contemporâneas</summary>
                    <DossierEssay
                      lesson={GENESIS_COURSE.modules[3]!.lessons[1]!}
                      course={GENESIS_COURSE}
                    />
                  </details>
                </>
              ) : (
                <>
                  <h2>Contextos registrados para esta passagem</h2>
                  <p>
                    Esta ocorrência ainda não tem um ensaio histórico-cultural editorial próprio. As
                    fontes privadas relacionadas podem oferecer contexto; sua pertinência deve ser
                    conferida.
                  </p>
                </>
              )}
              <DossierEvidence layer={data.privateLayer} ref={data.ref} />
            </TabsContent>
            <TabsContent value="interpretations" className="topic-tab-content">
              {genesis && (
                <DossierEssay
                  lesson={GENESIS_COURSE.modules[4]!.lessons[0]!}
                  course={GENESIS_COURSE}
                />
              )}
              <DossierEvidence layer={data.privateLayer} ref={data.ref} />
              {data.bundle.claims.status === "available" && (
                <details className="course-citations">
                  <summary>Afirmações do catálogo ({data.bundle.claims.data.length})</summary>
                  {data.bundle.claims.data.map((claim) => (
                    <p key={claim.id}>{claim.proposition}</p>
                  ))}
                </details>
              )}
            </TabsContent>
            <TabsContent value="sources" className="topic-tab-content">
              <h2>De onde vêm as informações</h2>
              <p>
                Texto bíblico, análise linguística, comentário privado e explicação editorial
                possuem origens distintas. A existência de um vínculo não substitui a conferência da
                evidência.
              </p>
              <ul className="dossier-source-list">
                {[...data.bundle.sources.references, ...(word?.sources.references ?? [])].map(
                  (source, index) => (
                    <li key={`${source.id}:${index}`}>
                      <strong>{source.work}</strong>
                      <small>
                        {source.author} {source.edition} · {source.id}
                      </small>
                    </li>
                  ),
                )}
              </ul>
              {genesis && (
                <details className="course-citations">
                  <summary>Bibliografia do aprofundamento editorial</summary>
                  <ul>
                    {GENESIS_COURSE.references.map((reference) => (
                      <li key={reference.id}>
                        <a href={reference.url} target="_blank" rel="noreferrer">
                          {reference.title} ↗
                        </a>
                        <small>{reference.perspective}</small>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              <DossierEvidence layer={data.privateLayer} ref={data.ref} />
              <CourseLibraryInventory />
              <Link
                to="/trace"
                search={{
                  state: "all",
                  offset: 0,
                  view: "history",
                  bookId: data.ref.bookId,
                  chapter: data.ref.chapter,
                  verse: data.ref.verseStart,
                }}
              >
                Abrir o histórico de ligações desta passagem →
              </Link>
            </TabsContent>
          </Tabs>
          {genesis && (
            <aside className="course-entry">
              <h2>Transforme a pesquisa em um percurso de estudo</h2>
              <p>O curso de Gênesis 1 conecta este dossiê a aulas, leituras e atividades.</p>
              <Link to="/study/course/$courseId" params={{ courseId: "genesis-1" }}>
                Estudar Gênesis 1 →
              </Link>
            </aside>
          )}
        </>
      )}
    </article>
  );
}
