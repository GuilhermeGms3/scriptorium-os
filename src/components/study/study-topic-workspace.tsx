import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Compass,
  Network,
  NotebookPen,
  Play,
  Feather,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Button } from "../ui/button";
import { useWorkspaceQuery } from "../../hooks/use-workspace-query";
import { useWorkbench } from "../../lib/workbench/workbench-context";
import {
  connectTopicStudy,
  loadTopicReadings,
  studiesForTopic,
  topicNoteLinks,
  type StudyTopic,
} from "../../lib/application/study-topic-service";
import type { KnowledgeExplorerBundle } from "../../lib/application/knowledge-query-service";
import type { KnowledgeClaim } from "../../lib/domain/knowledge";
import { StudyRepository } from "../../lib/repositories/study-repository";
import { StudyNotebook } from "./study-notebook";
import { StudyTopicReadings } from "./study-topic-readings";
import { StudyTopicConnections } from "./study-topic-connections";
import { StudyTopicVideos } from "./study-topic-videos";
import { ExplorerContent } from "./knowledge-explorer-content";
import { TopicPassageReading } from "./topic-passage-reading";
import type { StudyVideo } from "../../lib/application/youtube-study-service";
import { reviewStatusLabel } from "../../lib/i18n";

const TABS = [
  { id: "path", label: "Percurso", icon: Compass },
  { id: "readings", label: "Leituras", icon: BookOpen },
  { id: "connections", label: "Conexões", icon: Network },
  { id: "notebook", label: "Caderno", icon: NotebookPen },
  { id: "videos", label: "Vídeos", icon: Play },
] as const;

export function StudyTopicWorkspace({
  topic,
  bundle,
  focusedClaim,
}: {
  topic: StudyTopic;
  bundle?: KnowledgeExplorerBundle;
  focusedClaim?: KnowledgeClaim | null;
}) {
  const { studies, notes, refreshUserData, workspacePersistence, setPassageContext } =
    useWorkbench();
  useEffect(() => setPassageContext(null), [setPassageContext]);
  const [tab, setTab] = useState("path");
  const [step, setStep] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [attachGroup, setAttachGroup] = useState("");
  const [noteSession, setNoteSession] = useState(0);
  const [initialNoteId, setInitialNoteId] = useState<string>();
  const [draft, setDraft] = useState<{ title: string; body: string }>();
  const [busy, setBusy] = useState(false);
  const [noteDirty, setNoteDirty] = useState(false);
  const [status, setStatus] = useState("");
  const actionLock = useRef(false);
  const stepRail = useRef<HTMLElement>(null);
  const groups = studiesForTopic(topic, studies, notes);
  const groupId = groups.some((group) => group.id === selectedGroup)
    ? selectedGroup
    : groups[0]?.id;
  const canSave = workspacePersistence !== "loading" && workspacePersistence !== "unavailable";
  const readings = useWorkspaceQuery(
    ["topic-readings", topic.id],
    () => loadTopicReadings(topic, bundle),
    { enabled: tab === "readings" || !topic.guide, refreshOnKnowledgeChange: true },
  );
  const links = useMemo(() => topicNoteLinks(topic), [topic]);
  const modules = topic.guide?.modules ?? [
    {
      title: `Situar ${topic.title}`,
      explanation: topic.description,
      questions: [`Em que contexto ${topic.title} aparece nas fontes disponíveis?`],
      passages: [],
    },
    {
      title: "Ler as fontes disponíveis",
      explanation:
        "Abra uma ocorrência, leia o contexto e registre os termos usados pelo autor. Separe o que está escrito da sua interpretação e mantenha a origem da observação.",
      questions: [`Que trecho do acervo esclarece ${topic.title}, e o que ele deixa em aberto?`],
      passages: [],
    },
    {
      title: "Comparar e formular sua síntese",
      explanation:
        "Confronte as afirmações do catálogo com o que você leu. Identifique diferenças de contexto, tradição e método antes de conectar suas notas.",
      questions: [`Qual evidência sustentaria ou mudaria minha compreensão de ${topic.title}?`],
      passages: [],
    },
  ];
  const currentStep = Math.min(step, modules.length - 1);
  const current = modules[currentStep]!;
  const claim = focusedClaim ?? bundle?.claims[currentStep % Math.max(1, bundle.claims.length)];
  async function action(run: () => Promise<void>) {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setStatus("");
    try {
      await run();
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "Não foi possível guardar a alteração.");
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }
  async function ensureGroup(existingId?: string) {
    const study = await connectTopicStudy(topic, existingId ?? groupId);
    await refreshUserData();
    setSelectedGroup(study.id);
    return study;
  }
  function changeStep(index: number) {
    setStep(index);
    requestAnimationFrame(() => {
      const rail = stepRail.current;
      const active = rail?.querySelector<HTMLElement>('[aria-current="step"]');
      if (rail && active)
        rail.scrollTo({ left: active.offsetLeft - rail.clientWidth / 2 + active.offsetWidth / 2 });
    });
  }
  function replaceDraft() {
    if (
      noteDirty &&
      !window.confirm("Descartar as alterações da nota antes de abrir outro rascunho?")
    )
      return false;
    setNoteDirty(false);
    return true;
  }
  function openNote(group: string, noteId?: string) {
    if (!replaceDraft()) return;
    setSelectedGroup(group);
    setInitialNoteId(noteId);
    setDraft(undefined);
    setNoteSession((value) => value + 1);
    setTab("notebook");
  }
  function noteFromVideo(video: StudyVideo) {
    if (!replaceDraft()) return;
    void action(async () => {
      const group = await ensureGroup();
      setDraft({
        title: video.title,
        body: `Vídeo no YouTube: ${video.title}\nCanal: ${video.channel}\nhttps://www.youtube.com/watch?v=${video.id}\n\nMinhas observações:\n`,
      });
      setInitialNoteId(undefined);
      setSelectedGroup(group.id);
      setNoteSession((value) => value + 1);
      setTab("notebook");
    });
  }
  return (
    <article className="topic-workspace" data-study-guide={topic.kind === "guide" ? "" : undefined}>
      <Link to="/study" search={{}} className="topic-back">
        <ArrowLeft className="size-4" />
        Árvore de estudos
      </Link>
      <header className="topic-header">
        <div>
          <p className="meta-label">
            {topic.kind === "guide" ? "Percurso de formação" : "Tema do acervo"}
          </p>
          <h1>{topic.title}</h1>
          <p>{topic.description}</p>
        </div>
        <div className="topic-header-action">
          <Button
            variant="outline"
            disabled={!canSave || busy}
            onClick={() => {
              if (groupId) setTab("notebook");
              else
                void action(async () => {
                  await ensureGroup();
                  setTab("notebook");
                });
            }}
          >
            <NotebookPen className="mr-2 size-4" />
            {busy ? "Abrindo…" : groupId ? "Meu caderno neste tema" : "Começar meu caderno"}
          </Button>
          {groupId && (
            <span className="text-xs text-muted-foreground">
              {groups.find((group) => group.id === groupId)?.title}
            </span>
          )}
        </div>
      </header>
      {workspacePersistence === "loading" && (
        <p role="status" className="mb-4 text-sm text-muted-foreground">
          Abrindo seu workspace. O percurso já pode ser lido.
        </p>
      )}
      {workspacePersistence === "unavailable" && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          Seu workspace está indisponível. As fontes públicas continuam acessíveis; notas não podem
          ser salvas agora.
        </p>
      )}
      {workspacePersistence === "memory" && (
        <p role="status" className="mb-4 text-sm text-muted-foreground">
          Armazenamento temporário: exporte suas notas antes de fechar.
        </p>
      )}
      {status && (
        <p role="status" className="mb-4 text-sm">
          {status}
        </p>
      )}
      <Tabs value={tab} onValueChange={setTab} activationMode="manual">
        <div className="topic-tabs-scroll">
          <TabsList
            className="topic-tabs h-auto w-max min-w-full justify-start gap-1 rounded-none bg-transparent p-0"
            aria-label="Espaços do tema"
          >
            {TABS.map((item) => (
              <TabsTrigger
                key={item.id}
                value={item.id}
                className="rounded-none border-b-2 border-transparent px-4 py-4 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
              >
                <item.icon className="mr-2 size-4" />
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="path" className="topic-tab-content topic-path">
          <nav className="topic-path-rail" ref={stepRail} aria-label="Etapas do roteiro">
            {modules.map((module, index) => (
              <button
                key={`${index}:${module.title}`}
                type="button"
                aria-current={currentStep === index ? "step" : undefined}
                aria-controls="topic-step"
                onClick={() => changeStep(index)}
              >
                <span className="topic-path-marker">{String(index + 1).padStart(2, "0")}</span>
                <span className="topic-path-label">{module.title}</span>
              </button>
            ))}
          </nav>
          <div className="topic-path-intro">
            <h2>{topic.guide ? "Roteiro de estudo" : "Investigar a partir das fontes"}</h2>
            <details className="topic-path-context">
              <summary>Sobre este percurso</summary>
              <p>
                {topic.kind === "entity" && topic.guide
                  ? `Este tema utiliza o percurso editorial de ${topic.guide.title}. As leituras e conexões abaixo são consultadas especificamente para ${topic.title}.`
                  : "Um roteiro editorial orienta suas perguntas. Os textos, vínculos e notas vêm do acervo; nenhuma etapa registra domínio automaticamente."}
              </p>
            </details>
          </div>
          <section id="topic-step" className="topic-study-desk" aria-labelledby="topic-step-title">
            <div className="topic-orientation">
              <p className="topic-role-label">
                <Compass aria-hidden="true" /> Orientação de leitura{" "}
              </p>
              <div className="topic-chapter-heading">
                <span aria-hidden="true">{String(currentStep + 1).padStart(2, "0")}</span>
                <h3 id="topic-step-title">{current.title}</h3>
              </div>
              <p className="guide-explanation">{current.explanation}</p>
              {current.passages.length > 0 && (
                <div className="topic-starting-texts">
                  {current.passages.map((passage) => (
                    <TopicPassageReading
                      key={`${passage.book}:${passage.chapter}`}
                      passage={passage}
                    />
                  ))}
                </div>
              )}
              <div className="topic-source-actions">
                <Button variant="outline" onClick={() => setTab("readings")}>
                  <BookOpen className="mr-2 size-4" />
                  Consultar leituras do tema
                </Button>
                <Button variant="ghost" onClick={() => setTab("connections")}>
                  Explorar conexões
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </div>
            </div>
            <aside className="topic-inquiry" aria-label="Investigar e escrever">
              <p className="topic-role-label">
                <Feather aria-hidden="true" /> Investigar e escrever
              </p>
              {current.questions.map((question) => (
                <div key={question} className="topic-inquiry-question">
                  <p>{question}</p>
                  <div className="topic-inquiry-actions">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy || !canSave}
                      onClick={() =>
                        void action(async () => {
                          const study = await ensureGroup();
                          const questions = await StudyRepository.listResearchQuestions(study.id);
                          if (!questions.some((item) => item.question === question))
                            await StudyRepository.createResearchQuestion({
                              studyId: study.id,
                              question,
                            });
                          await refreshUserData();
                          setStatus("Pergunta guardada na sua investigação.");
                        })
                      }
                    >
                      Guardar pergunta
                    </Button>
                    <Button
                      size="sm"
                      className="bg-[var(--inquiry-ink)] text-background hover:bg-[var(--inquiry-ink)] hover:brightness-110"
                      disabled={busy || !canSave}
                      onClick={() => {
                        if (!replaceDraft()) return;
                        void action(async () => {
                          await ensureGroup();
                          setDraft({ title: question, body: "" });
                          setInitialNoteId(undefined);
                          setNoteSession((value) => value + 1);
                          setTab("notebook");
                        });
                      }}
                    >
                      Escrever minha resposta
                    </Button>
                  </div>
                </div>
              ))}
            </aside>
          </section>
          {claim && (
            <aside className="topic-recorded-claim">
              <p className="meta-label">
                Afirmação já registrada no catálogo · {reviewStatusLabel(claim.reviewStatus)}
              </p>
              <p>{claim.proposition}</p>
              <button
                className="text-sm text-primary hover:underline"
                onClick={() => setTab("connections")}
              >
                Conferir relações e evidências →
              </button>
            </aside>
          )}
          <div className="topic-pager">
            <Button
              variant="ghost"
              disabled={currentStep === 0}
              onClick={() => changeStep(currentStep - 1)}
            >
              ← Etapa anterior
            </Button>
            <span>
              {currentStep + 1} de {modules.length} · roteiro, sem progresso automático
            </span>
            <Button
              variant="ghost"
              disabled={currentStep === modules.length - 1}
              onClick={() => changeStep(currentStep + 1)}
            >
              Próxima etapa →
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="readings" className="topic-tab-content">
          <StudyTopicReadings
            topic={topic}
            {...(readings.data ? { readings: readings.data } : {})}
            pending={readings.isPending}
            error={Boolean(readings.error)}
            onRetry={() => void readings.refetch()}
            {...(groupId ? { studyId: groupId } : {})}
          />
        </TabsContent>
        <TabsContent value="connections" className="topic-tab-content">
          <StudyTopicConnections
            topic={topic}
            {...(bundle ? { bundle } : {})}
            onOpenNote={openNote}
          />
          {bundle && (
            <details className="topic-evidence-details">
              <summary>Abrir afirmações, argumentos e fontes do catálogo</summary>
              <ExplorerContent bundle={bundle} focusedClaim={focusedClaim ?? null} />
            </details>
          )}
        </TabsContent>
        <TabsContent
          value="notebook"
          forceMount
          hidden={tab !== "notebook"}
          className="topic-tab-content"
        >
          <div className="topic-section-heading">
            <p className="meta-label">Seu conhecimento em construção</p>
            <h2>Um caderno ligado a {topic.title}</h2>
            <p>
              Notas, fontes e conexões pessoais permanecem no mesmo workspace. Você decide o que
              relacionar e o que concluir.
            </p>
          </div>
          <div className="topic-group-controls">
            {groups.length > 0 && (
              <label className="flex min-w-0 flex-col gap-2 text-sm">
                Caderno deste tema
                <select
                  className="topic-reading-select"
                  value={groupId ?? ""}
                  onChange={(event) => openNote(event.target.value)}
                >
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <Button
              variant="outline"
              disabled={busy || !canSave}
              onClick={() =>
                void action(async () => {
                  await ensureGroup();
                  setTab("notebook");
                })
              }
            >
              {groupId ? "Retomar grupo associado" : "Criar caderno para este tema"}
            </Button>
            <details>
              <summary className="cursor-pointer text-sm text-primary">
                Associar um grupo existente
              </summary>
              <div className="mt-3 flex flex-wrap gap-2">
                <select
                  aria-label="Grupo para associar ao tema"
                  className="topic-reading-select"
                  value={attachGroup}
                  onChange={(event) => setAttachGroup(event.target.value)}
                >
                  <option value="">Escolha um grupo…</option>
                  {studies
                    .filter((study) => !groups.some((group) => group.id === study.id))
                    .map((study) => (
                      <option key={study.id} value={study.id}>
                        {study.title}
                      </option>
                    ))}
                </select>
                <Button
                  disabled={!attachGroup || busy || !canSave}
                  variant="outline"
                  onClick={() => {
                    if (!replaceDraft()) return;
                    void action(async () => {
                      await ensureGroup(attachGroup);
                      setAttachGroup("");
                    });
                  }}
                >
                  Associar
                </Button>
              </div>
            </details>
          </div>
          {groupId ? (
            <StudyNotebook
              key={`${groupId}:${noteSession}`}
              studyId={groupId}
              contextLinks={links}
              onDirtyChange={setNoteDirty}
              {...(initialNoteId ? { initialNoteId } : {})}
              {...(draft ? { initialDraft: draft } : {})}
              focused
            />
          ) : (
            <div className="topic-empty">
              <NotebookPen className="size-7 text-primary" />
              <h3>O espaço está pronto para suas ideias.</h3>
              <p>
                Crie um caderno ou associe um grupo existente. As próximas notas já guardarão a
                ligação com este tema.
              </p>
            </div>
          )}
        </TabsContent>
        <TabsContent value="videos" className="topic-tab-content">
          <StudyTopicVideos title={topic.title} onRecord={noteFromVideo} />
        </TabsContent>
      </Tabs>
    </article>
  );
}
