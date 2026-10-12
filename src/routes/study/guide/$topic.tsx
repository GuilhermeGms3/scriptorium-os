import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BookOpen, NotebookPen } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  loadStudyGuideMaterials,
  type GuideMaterials,
} from "../../../lib/application/study-guide-service";
import { studyGuideById, studyForGuide, type StudyGuide } from "../../../lib/content/study-guides";
import { knowledgeLabel } from "../../../lib/content/knowledge-presentation";
import { useWorkbench } from "../../../lib/workbench/workbench-context";
import { StudyRepository } from "../../../lib/repositories/study-repository";

export const Route = createFileRoute("/study/guide/$topic")({
  head: ({ params }) => ({
    meta: [
      {
        title: `${studyGuideById(params.topic)?.title ?? "Guia não encontrado"} — Estudos — Scriptorium`,
      },
    ],
  }),
  component: StudyGuidePage,
});

function StudyGuidePage() {
  const { topic } = Route.useParams();
  const guide = studyGuideById(topic);
  if (!guide)
    return (
      <div className="p-7">
        <h1 className="font-serif text-2xl">Guia não encontrado</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Este tema não faz parte do roteiro atual.
        </p>
        <Link to="/study" className="mt-5 inline-block text-sm text-primary hover:underline">
          Voltar à árvore de estudos
        </Link>
      </div>
    );
  return <GuideContent key={guide.id} guide={guide} />;
}

function GuideContent({ guide }: { guide: StudyGuide }) {
  const {
    studies,
    createStudy,
    addToStudy,
    refreshUserData,
    setPassageContext,
    workspacePersistence,
  } = useWorkbench();
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<GuideMaterials>();
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const actionLock = useRef(false);
  const existing = studyForGuide(guide, studies);
  useEffect(() => setPassageContext(null), [setPassageContext]);
  useEffect(() => {
    let active = true;
    setMaterials(undefined);
    void loadStudyGuideMaterials(guide)
      .then((result) => {
        if (active) setMaterials(result);
      })
      .catch((error: unknown) => {
        if (active)
          setMaterials({
            resources: [],
            missingResources: [],
            excerpts: [],
            concepts: [],
            warnings: [
              error instanceof Error ? error.message : "Não foi possível consultar os materiais.",
            ],
          });
      });
    return () => {
      active = false;
    };
  }, [guide, attempt, workspacePersistence]);

  const investigate = async (question?: string) => {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setStatus("");
    try {
      const study = existing ?? (await createStudy(guide.title));
      if (!study.items.some((item) => item.refId === `study-guide:${guide.id}`)) {
        await addToStudy(study.id, {
          kind: "concept",
          refId: `study-guide:${guide.id}`,
          label: `Guia: ${guide.title}`,
        });
      }
      if (question) {
        const questions = await StudyRepository.listResearchQuestions(study.id);
        if (!questions.some((item) => item.question === question)) {
          await StudyRepository.createResearchQuestion({ question, studyId: study.id });
          await refreshUserData();
        }
        setStatus("Pergunta registrada na sua investigação.");
      } else await navigate({ to: "/study/$slug", params: { slug: study.slug } });
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "Não foi possível salvar a investigação.");
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  };
  const canSave = workspacePersistence === "opfs" || workspacePersistence === "memory";

  return (
    <article data-study-guide className="mx-auto w-full min-w-0 max-w-6xl px-5 py-6 md:px-9">
      <Link
        to="/study"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Árvore de estudos
      </Link>
      <header className="mt-6 border-b border-border pb-6">
        <p className="meta-label">Guia de estudo · roteiro editorial do Scriptorium</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold md:text-4xl">{guide.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          {guide.introduction}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button
            type="button"
            disabled={busy || !canSave}
            onClick={() => void investigate()}
            className="inline-flex min-h-10 items-center gap-2 bg-primary px-4 text-sm text-primary-foreground disabled:opacity-50"
          >
            <NotebookPen className="size-4" />
            {busy
              ? "Salvando…"
              : existing
                ? "Continuar minha investigação"
                : "Criar minha investigação"}
          </button>
          <span className="text-xs text-muted-foreground">
            {guide.modules.length} módulos · leitura, comparação e registro
          </span>
        </div>
        {workspacePersistence === "loading" && (
          <p role="status" className="mt-3 text-xs text-muted-foreground">
            Abrindo seu workspace. O roteiro já pode ser lido.
          </p>
        )}
        {workspacePersistence === "unavailable" && (
          <p role="alert" className="mt-3 text-xs text-destructive">
            Workspace indisponível: o guia pode ser lido, mas não é possível salvar.
          </p>
        )}
        {workspacePersistence === "memory" && (
          <p role="status" className="mt-3 text-xs text-muted-foreground">
            Armazenamento temporário: exporte seu workspace antes de fechar.
          </p>
        )}
        {status && (
          <p role="status" className="mt-3 text-sm">
            {status}
          </p>
        )}
      </header>
      <nav
        aria-label="Seções do guia"
        className="flex flex-wrap gap-x-5 gap-y-2 border-b border-border py-4 text-sm text-primary"
      >
        <a href="#roteiro" className="hover:underline">
          Roteiro
        </a>
        <a href="#fontes" className="hover:underline">
          Fontes de partida
        </a>
        <a href="#acervo" className="hover:underline">
          Nos seus livros
        </a>
        <a href="#aprofundar" className="hover:underline">
          Aprofundar
        </a>
      </nav>
      <section id="roteiro" aria-labelledby="roteiro-title" className="scroll-mt-5 py-7">
        <p className="meta-label">Aprender com um percurso</p>
        <h2 id="roteiro-title" className="mt-1 font-serif text-2xl">
          Roteiro de estudo
        </h2>
        <p className="mt-2 max-w-3xl text-xs leading-6 text-muted-foreground">
          Leia, registre observações, compare fontes e formule sua síntese. As perguntas abaixo
          orientam investigação; não são conclusões doutrinárias nem citações dos livros.
        </p>
        <ol className="mt-5 divide-y divide-border border-y border-border">
          {guide.modules.map((module, index) => (
            <li key={module.title} className="grid gap-3 py-6 sm:grid-cols-[42px_minmax(0,1fr)]">
              <span aria-hidden="true" className="font-mono text-lg text-primary/70">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="font-serif text-xl font-semibold">{module.title}</h3>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
                  {module.explanation}
                </p>
                {module.passages.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {module.passages.map((passage) => (
                      <Link
                        key={`${passage.book}:${passage.chapter}`}
                        to="/scripture/$book/$chapter"
                        params={{ book: passage.book, chapter: String(passage.chapter) }}
                        className="inline-flex items-center gap-1.5 border border-input px-2.5 py-1.5 text-xs hover:bg-accent"
                      >
                        <BookOpen className="size-3" />
                        {passage.label}
                      </Link>
                    ))}
                  </div>
                )}
                {module.questions.map((question) => (
                  <div key={question} className="mt-4 border-l-2 border-primary/40 pl-4">
                    <p className="text-sm leading-6">{question}</p>
                    <button
                      type="button"
                      disabled={busy || !canSave}
                      onClick={() => void investigate(question)}
                      className="mt-2 min-h-8 text-xs text-primary hover:underline disabled:opacity-50"
                    >
                      Registrar esta pergunta na minha investigação
                    </button>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section
        id="fontes"
        aria-labelledby="fontes-title"
        className="scroll-mt-5 border-t border-border py-7"
      >
        <h2 id="fontes-title" className="font-serif text-2xl">
          Fontes de partida
        </h2>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">
          Obras indicadas pelo roteiro e confirmadas no catálogo. O texto é carregado somente ao
          abrir a obra; idioma e disponibilidade não significam concordância com seu conteúdo.
        </p>
        {!materials ? (
          <p role="status" className="mt-4 text-sm text-muted-foreground">
            Consultando catálogo e índices do workspace…
          </p>
        ) : (
          <>
            {materials.warnings.length > 0 && (
              <div role="alert" className="mt-4 border border-border p-3 text-sm">
                {materials.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
                <button
                  type="button"
                  onClick={() => setAttempt((value) => value + 1)}
                  className="mt-2 text-primary hover:underline"
                >
                  Tentar novamente
                </button>
              </div>
            )}
            <ul className="mt-4 divide-y divide-border">
              {materials.resources.map((resource) => (
                <li key={resource.workId} className="py-3">
                  <Link
                    to="/library/read/$workId"
                    params={{ workId: resource.workId }}
                    className="inline-flex items-center gap-2 text-sm font-medium hover:text-primary"
                  >
                    <BookOpen className="size-4" />
                    {resource.label}
                    <ArrowRight className="size-3.5" />
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Idioma da edição:{" "}
                    {resource.languages
                      .map(
                        (language) =>
                          ({
                            en: "inglês",
                            cop: "copta",
                            grc: "grego",
                            pt: "português",
                            "pt-BR": "português",
                          })[language] ?? language,
                      )
                      .join(", ")}
                  </p>
                </li>
              ))}
            </ul>
            {materials.resources.length === 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                {materials.warnings.length
                  ? "A disponibilidade ainda não pôde ser confirmada."
                  : "Não há uma fonte primária selecionada neste roteiro. Consulte abaixo os resultados nos seus livros."}
              </p>
            )}
            {materials.missingResources.length > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                Indicações ainda não confirmadas no catálogo:{" "}
                {materials.missingResources.map((resource) => resource.label).join("; ")}.
              </p>
            )}
          </>
        )}
      </section>
      <section
        id="acervo"
        aria-labelledby="acervo-title"
        className="scroll-mt-5 border-t border-border py-7"
      >
        <h2 id="acervo-title" className="font-serif text-2xl">
          Encontre o tema nos seus livros
        </h2>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">
          Busca textual indexada por {guide.keywords.map((term) => `“${term}”`).join(", ")}. Até 12
          páginas, sem duplicatas. São ocorrências para leitura contextual — não conexões semânticas
          aprovadas nem cobertura completa do tema.
        </p>
        {!materials ? (
          <p role="status" className="mt-4 text-sm text-muted-foreground">
            Buscando páginas relacionadas…
          </p>
        ) : materials.excerpts.length ? (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {materials.excerpts.map((hit) => (
              <li
                key={`${hit.documentId}:${hit.pageIndex}`}
                className="min-w-0 border border-border bg-card p-4"
              >
                <p className="meta-label">Ocorrência textual · página {hit.pageLabel}</p>
                <h3 className="mt-2 break-words text-sm font-medium">{hit.title}</h3>
                <p className="mt-2 break-words text-xs leading-6 text-muted-foreground">
                  {hit.snippet}
                </p>
                <Link
                  to="/library/document/$documentId"
                  params={{ documentId: hit.documentId }}
                  search={{ page: hit.pageIndex + 1 }}
                  className="mt-3 inline-flex min-h-8 items-center gap-2 text-xs text-primary hover:underline"
                >
                  Ler página e contexto <ArrowRight className="size-3" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            {materials.warnings.length
              ? "Não foi possível confirmar todos os resultados do acervo. Use Tentar novamente acima."
              : "Nenhuma página encontrada pelos termos deste guia. Isso não prova ausência do assunto: sinônimos, OCR ou indexação podem limitar a consulta."}
          </p>
        )}
        <Link to="/library" className="mt-4 inline-block text-xs text-primary hover:underline">
          Abrir acervo completo
        </Link>
      </section>
      <section
        id="aprofundar"
        aria-labelledby="aprofundar-title"
        className="scroll-mt-5 border-t border-border py-7"
      >
        <h2 id="aprofundar-title" className="font-serif text-2xl">
          Continuar o percurso
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {guide.relatedIds.map((id) => {
            const related = studyGuideById(id);
            return related ? (
              <Link
                key={id}
                to="/study/guide/$topic"
                params={{ topic: id }}
                className="border border-border p-4 hover:bg-accent"
              >
                <span className="font-serif text-lg">{related.title}</span>
                <span className="mt-2 block text-xs leading-6 text-muted-foreground">
                  {related.introduction}
                </span>
                <span className="mt-2 inline-flex items-center gap-2 text-xs text-primary">
                  Abrir guia <ArrowRight className="size-3" />
                </span>
              </Link>
            ) : null;
          })}
        </div>
        {materials && materials.concepts.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium">Conceitos encontrados no índice de conhecimento</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {materials.concepts.map((concept) => (
                <Link
                  key={concept.id}
                  to="/knowledge"
                  search={{ entity: concept.id }}
                  className="border border-input px-3 py-2 text-xs hover:bg-accent"
                >
                  {knowledgeLabel(concept.id, concept.label)}
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </article>
  );
}
