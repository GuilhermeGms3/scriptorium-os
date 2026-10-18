import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, Check, Lock, NotebookPen } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Button } from "../ui/button";
import { useWorkspaceQuery } from "../../hooks/use-workspace-query";
import { useStudyDraftGuard } from "../../hooks/use-study-draft-guard";
import { useWorkbench } from "../../lib/workbench/workbench-context";
import {
  emptyCourseWork,
  moduleUnlocked,
  completionIssues,
  type StudyCourse,
  type CourseProgress,
  type CourseWork,
} from "../../lib/domain/study-course";
import type { NoteLink } from "../../lib/domain/study";
import { StudyCourseRepository } from "../../lib/repositories/study-course-repository";
import {
  connectTopicStudy,
  studiesForTopic,
  type StudyTopic,
} from "../../lib/application/study-topic-service";
import { StudyNotebook } from "./study-notebook";
import { StudyTopicVideos } from "./study-topic-videos";
import { CoursePassageReading } from "./course-passages";
import {
  CourseExternalReferences,
  CourseLibraryInventory,
  CoursePrivateReadings,
} from "./course-library";

const labels = [
  ["content", "Conteúdo"],
  ["path", "Percurso"],
  ["readings", "Leituras"],
  ["connections", "Conexões"],
  ["notebook", "Caderno"],
  ["videos", "Vídeos"],
] as const;
const sectionLabels = {
  introduction: "Introdução",
  concept: "Conceito",
  example: "Exemplo explicado",
  discussion: "Discussão",
  conclusion: "Conclusão",
};

export function AcademicCourseWorkspace({
  course,
  initialModule,
}: {
  course: StudyCourse;
  initialModule?: string;
}) {
  const query = useWorkspaceQuery(
    ["course-progress", course.id, course.revision],
    () => StudyCourseRepository.load(course),
    { refreshOnKnowledgeChange: true },
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [session, setSession] = useState(0);
  useEffect(() => {
    if (selected === null && query.data)
      setSelected(
        initialModule && moduleUnlocked(course, initialModule, query.data)
          ? initialModule
          : (course.modules.find(
              (m) => !query.data.some((p) => p.moduleId === m.id && p.completedAt),
            )?.id ?? course.modules[0]!.id),
      );
  }, [selected, query.data, course, initialModule]);
  const module = course.modules.find((item) => item.id === selected) ?? course.modules[0]!;
  const progress = query.data ?? [];
  return (
    <article className="topic-workspace course-workspace">
      <Link to="/study" search={{}} className="topic-back">
        <ArrowLeft className="size-4" /> Árvore de estudos
      </Link>
      <header className="topic-header">
        <div>
          <p className="meta-label">Formação acadêmica · percurso orientado</p>
          <h1>{course.title}</h1>
          <p>{course.description}</p>
        </div>
        <span className="course-progress-count">
          {query.isSuccess
            ? `${progress.filter((p) => p.completedAt).length}/${course.modules.length} módulos realizados`
            : query.isPending
              ? "Carregando progresso…"
              : "Progresso indisponível"}
        </span>
      </header>
      <details className="course-overview">
        <summary>Objetivos, preparação e critérios do percurso</summary>
        <p>
          Leitura e atividades confirmadas por você. A conclusão indica realização do percurso, sem
          certificação automática de domínio ou concordância religiosa.
        </p>
        <h2>Ao concluir</h2>
        <ul>
          {course.outcomes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <h2>Antes de começar</h2>
        <ul>
          {course.prerequisites.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>
          Conteúdo explicativo original do Scriptorium. Fontes e perspectivas são identificadas nas
          aulas. Revisão acadêmica independente não é atribuída ao material.
        </p>
      </details>
      {query.isPending && (
        <p role="status">Abrindo seu progresso. A primeira etapa já pode ser lida.</p>
      )}
      {query.isError && (
        <p role="alert">
          Não foi possível carregar seu progresso. As aulas permanecem disponíveis; a gravação está
          desabilitada.{" "}
          <button className="underline" onClick={() => void query.refetch()}>
            Tentar novamente
          </button>
        </p>
      )}
      <CourseModuleWorkspace
        key={`${course.id}:${module.id}:${query.isPending ? "pending" : "settled"}:${session}`}
        course={course}
        moduleId={module.id}
        progress={progress}
        ready={query.isSuccess}
        onModule={setSelected}
        onSaved={async () => {
          await query.refetch();
          setSession((value) => value + 1);
        }}
      />
    </article>
  );
}

function CourseModuleWorkspace({
  course,
  moduleId,
  progress,
  ready,
  onModule,
  onSaved,
}: {
  course: StudyCourse;
  moduleId: string;
  progress: CourseProgress[];
  ready: boolean;
  onModule: (id: string) => void;
  onSaved: () => Promise<void>;
}) {
  const module = course.modules.find((item) => item.id === moduleId)!;
  const saved = progress.find((item) => item.moduleId === moduleId);
  const [baseVersion] = useState(saved?.version ?? 0);
  const [work, setWork] = useState<CourseWork>(saved?.work ?? emptyCourseWork());
  const [dirty, setDirty] = useState(false);
  const [noteDirty, setNoteDirty] = useState(false);
  const [tab, setTab] = useState("content");
  const [lessonId, setLessonId] = useState(module.lessons[0]!.id);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState<{ title: string; body: string }>();
  const [noteSession, setNoteSession] = useState(0);
  const { studies, notes, workspacePersistence, refreshUserData, setPassageContext } =
    useWorkbench();
  useEffect(() => setPassageContext(null), [setPassageContext]);
  useStudyDraftGuard(dirty || noteDirty);
  const topic: StudyTopic = useMemo(
    () => ({
      id: `study-course:${course.id}`,
      kind: "guide",
      title: course.title,
      description: course.description,
      terms: [],
    }),
    [course],
  );
  const group = studiesForTopic(topic, studies, notes)[0];
  const moduleKey = `study-course:${course.id}:${course.revision}:${module.id}`;
  const links: NoteLink[] = useMemo(
    () => [
      { kind: "concept", target: topic.id, label: course.title },
      { kind: "concept", target: moduleKey, label: module.title },
      ...module.passages.map((passage) => ({
        kind: "passage" as const,
        target: JSON.stringify(passage.ref),
        label: passage.label,
      })),
    ],
    [topic.id, course.title, moduleKey, module],
  );
  const canSave =
    ready && !busy && workspacePersistence !== "loading" && workspacePersistence !== "unavailable";
  const currentLesson = module.lessons.find((item) => item.id === lessonId) ?? module.lessons[0]!;
  function change(next: CourseWork) {
    setWork(next);
    setDirty(true);
    setMessage("");
  }
  function toggle(list: "lessons" | "readings", id: string, checked: boolean) {
    change({
      ...work,
      [list]: checked
        ? [...new Set([...work[list], id])]
        : work[list].filter((value) => value !== id),
    });
  }
  function selectModule(id: string) {
    if (id === moduleId || !moduleUnlocked(course, id, progress)) return;
    if (
      (dirty || noteDirty) &&
      !window.confirm("Descartar os rascunhos não salvos antes de mudar de módulo?")
    )
      return;
    onModule(id);
  }
  async function save(complete: boolean) {
    if (busy || noteDirty) return;
    setBusy(true);
    setMessage("");
    try {
      await StudyCourseRepository.save(course, moduleId, work, baseVersion, complete);
      setDirty(false);
      await onSaved();
    } catch (cause) {
      setMessage(
        cause instanceof Error ? cause.message : "Não foi possível guardar seu progresso.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function notebook(activity: boolean, explicitDraft?: { title: string; body: string }) {
    if (noteDirty && !window.confirm("Descartar o rascunho de nota antes de abrir outro?")) return;
    setBusy(true);
    try {
      await connectTopicStudy(topic, group?.id);
      await refreshUserData();
      setDraft(
        explicitDraft ??
          (activity
            ? {
                title: `${module.title} — minha síntese`,
                body: `${module.activity.prompt}\n\n${work.response}`,
              }
            : undefined),
      );
      setNoteSession((n) => n + 1);
      setNoteDirty(false);
      setTab("notebook");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Não foi possível abrir o caderno.");
    } finally {
      setBusy(false);
    }
  }
  const issues = completionIssues(module, work);
  return (
    <>
      <nav className="course-module-rail" aria-label="Módulos do percurso">
        {course.modules.map((item, index) => {
          const done = progress.some((p) => p.moduleId === item.id && p.completedAt);
          const unlocked = moduleUnlocked(course, item.id, progress);
          return (
            <button
              type="button"
              key={item.id}
              disabled={!unlocked}
              aria-current={module.id === item.id ? "step" : undefined}
              onClick={() => selectModule(item.id)}
            >
              <span className="course-module-marker">
                {done ? (
                  <Check aria-label="Concluído" />
                ) : !unlocked ? (
                  <Lock aria-label="Bloqueado" />
                ) : (
                  String(index + 1).padStart(2, "0")
                )}
              </span>
              <strong>{item.title}</strong>
              <small>
                {done
                  ? "Realizado"
                  : !unlocked
                    ? "Após a etapa anterior"
                    : item.id === module.id
                      ? "Você está aqui"
                      : "Disponível"}
              </small>
            </button>
          );
        })}
      </nav>
      <div className="course-module-heading">
        <p className="meta-label">
          Módulo {course.modules.indexOf(module) + 1} ·{" "}
          {saved?.completedAt ? "realizado" : "em estudo"}
        </p>
        <h2>{module.title}</h2>
        <p>{module.description}</p>
      </div>
      {workspacePersistence === "memory" && (
        <p role="status" className="course-purpose">
          Armazenamento temporário nesta aba. O progresso será perdido ao fechar ou recarregar.
          Feche outras abas deste workspace e reabra para tentar usar o armazenamento persistente.
        </p>
      )}
      <Tabs value={tab} onValueChange={setTab} activationMode="manual">
        <div className="topic-tabs-scroll">
          <TabsList
            className="topic-tabs h-auto w-max min-w-full justify-start gap-1 rounded-none bg-transparent p-0"
            aria-label="Áreas do módulo"
          >
            {labels.map(([id, label]) => (
              <TabsTrigger key={id} value={id}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="content" className="topic-tab-content">
          <nav className="course-lesson-nav" aria-label="Aulas do módulo">
            {module.lessons.map((lesson) => (
              <button
                key={lesson.id}
                type="button"
                aria-current={lesson.id === currentLesson.id ? "page" : undefined}
                onClick={() => setLessonId(lesson.id)}
              >
                {work.lessons.includes(lesson.id) && <Check className="size-4" />}
                {lesson.title}
              </button>
            ))}
          </nav>
          <article className="course-lesson">
            <h2>{currentLesson.title}</h2>
            {currentLesson.sections.map((section, index) => (
              <section
                key={`${currentLesson.id}:${index}`}
                className={`course-section course-section-${section.kind}`}
              >
                <p className="course-role">{sectionLabels[section.kind]}</p>
                <h3>{section.title}</h3>
                {section.paragraphs.map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
                {section.references.length > 0 && (
                  <details className="course-citations">
                    <summary>Referências desta explicação</summary>
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
            <label className="course-check">
              <input
                type="checkbox"
                checked={work.lessons.includes(currentLesson.id)}
                disabled={!canSave || Boolean(saved?.completedAt)}
                onChange={(event) => toggle("lessons", currentLesson.id, event.target.checked)}
              />
              Concluí a leitura desta aula.
            </label>
          </article>
          <section className="course-activity">
            <p className="meta-label">Prática e registro</p>
            <h2>Minha atividade</h2>
            <p>{module.activity.prompt}</p>
            <label htmlFor="course-response">Resposta com argumento e fontes</label>
            <textarea
              id="course-response"
              rows={7}
              maxLength={30000}
              value={work.response}
              disabled={!canSave}
              onChange={(event) => change({ ...work, response: event.target.value })}
            />
            <fieldset disabled={!canSave || Boolean(saved?.completedAt)}>
              <legend>Antes de concluir, confira sua resposta</legend>
              {module.activity.criteria.map((criterion, index) => (
                <label className="course-check" key={criterion}>
                  <input
                    type="checkbox"
                    checked={work.criteria.includes(index)}
                    onChange={(event) =>
                      change({
                        ...work,
                        criteria: event.target.checked
                          ? [...new Set([...work.criteria, index])]
                          : work.criteria.filter((id) => id !== index),
                      })
                    }
                  />
                  {criterion}
                </label>
              ))}
            </fieldset>
            <Button
              variant="outline"
              disabled={!canSave || !work.response.trim()}
              onClick={() => void notebook(true)}
            >
              <NotebookPen className="mr-2 size-4" />
              Levar minha atividade ao caderno
            </Button>
          </section>
        </TabsContent>
        <TabsContent value="path" className="topic-tab-content">
          <h2>O que esta etapa desenvolve</h2>
          <ol className="course-objectives">
            {module.objectives.map((objective) => (
              <li key={objective}>{objective}</li>
            ))}
          </ol>
          <h3>Como concluir</h3>
          <p>
            Leia as aulas e passagens, registre sua atividade e confira os critérios. O próximo
            módulo fica disponível quando a conclusão é salva.
          </p>
          <ul>
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
          {!issues.length && (
            <p>As atividades registradas atendem aos critérios de conclusão desta etapa.</p>
          )}
        </TabsContent>
        <TabsContent value="readings" className="topic-tab-content">
          <h2>Leitura bíblica orientada</h2>
          {module.passages.map((passage) => (
            <CoursePassageReading
              key={passage.id}
              passage={passage}
              checked={work.readings.includes(passage.id)}
              disabled={!canSave || Boolean(saved?.completedAt)}
              onCheck={(checked) => toggle("readings", passage.id, checked)}
            />
          ))}
          <CoursePrivateReadings
            module={module}
            links={links}
            {...(group ? { studyId: group.id } : {})}
          />
          <CourseExternalReferences course={course} module={module} />
          <CourseLibraryInventory />
        </TabsContent>
        <TabsContent value="connections" className="topic-tab-content">
          <h2>Conexões com uma razão</h2>
          <div className="course-connections">
            {module.connections.map((connection, index) => (
              <article key={index}>
                <h3>{connection.label}</h3>
                <p>{connection.explanation}</p>
                {connection.entityId && (
                  <Link to="/study" search={{ entity: connection.entityId }}>
                    Explorar o tema →
                  </Link>
                )}
                {connection.ref && (
                  <Link
                    to="/scripture/$book/$chapter"
                    params={{
                      book: connection.ref.bookId,
                      chapter: String(connection.ref.chapter),
                    }}
                    hash={`verse-${connection.ref.verseStart ?? 1}`}
                  >
                    Abrir a passagem →
                  </Link>
                )}
              </article>
            ))}
          </div>
          <Link
            to="/trace"
            search={{
              state: "all",
              offset: 0,
              q: module.id === "linguagem" ? "Bereshit" : "Gênesis 1:1",
              view: "research",
            }}
          >
            Investigar no Rastro →
          </Link>
          <p>As suas ligações pessoais permanecem no caderno e na área de Notas.</p>
        </TabsContent>
        <TabsContent
          value="notebook"
          forceMount
          hidden={tab !== "notebook"}
          className="topic-tab-content"
        >
          <h2>Caderno · {module.title}</h2>
          <p>
            O caderno é compartilhado pelo percurso. Novas notas recebem os vínculos desta etapa,
            com o curso, o módulo e as passagens. O editor de Notas e suas pastas continuam
            disponíveis.
          </p>
          {group ? (
            <StudyNotebook
              key={`${module.id}:${noteSession}`}
              studyId={group.id}
              contextLinks={links}
              onDirtyChange={setNoteDirty}
              {...(draft ? { initialDraft: draft } : {})}
            />
          ) : (
            <Button variant="outline" disabled={!canSave} onClick={() => void notebook(false)}>
              Criar caderno deste percurso
            </Button>
          )}
        </TabsContent>
        <TabsContent value="videos" className="topic-tab-content">
          {module.videos.length > 0 && (
            <section className="course-external">
              <h2>Material audiovisual selecionado</h2>
              <ul>
                {module.videos.map((video) => (
                  <li key={video.url}>
                    <a href={video.url} target="_blank" rel="noreferrer">
                      {video.title} · {video.author} ↗
                    </a>
                    <p>{video.purpose}</p>
                    <small>{video.perspective}</small>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {!module.videos.length && (
            <p>
              Não há vídeo selecionado especificamente para esta etapa. A busca opcional abaixo
              permite explorar complementos.
            </p>
          )}
          <StudyTopicVideos
            title={`${module.title} Gênesis 1`}
            onRecord={(video) => {
              void notebook(false, {
                title: video.title,
                body: `${video.title}\nCanal: ${video.channel}\nhttps://www.youtube.com/watch?v=${video.id}\n\nMinhas observações:\n`,
              });
            }}
          />
        </TabsContent>
      </Tabs>
      <footer className="course-savebar">
        <p role="status" className="whitespace-pre-line">
          {(noteDirty
            ? "Salve ou descarte o rascunho do caderno antes de salvar o progresso."
            : message) ||
            (dirty
              ? "Alterações ainda não salvas."
              : saved?.completedAt
                ? "Etapa concluída; você pode revisitar as leituras."
                : saved
                  ? "Progresso salvo neste workspace."
                  : "Seu progresso será salvo ao confirmar.")}
        </p>
        <div>
          <Button
            variant="outline"
            disabled={!canSave || !dirty || noteDirty}
            onClick={() => void save(false)}
          >
            Salvar progresso
          </Button>
          {!saved?.completedAt ? (
            <Button
              disabled={!canSave || issues.length > 0 || noteDirty}
              onClick={() => void save(true)}
            >
              <Check className="mr-2 size-4" />
              Concluir módulo
            </Button>
          ) : course.modules.indexOf(module) < course.modules.length - 1 ? (
            <Button
              disabled={busy}
              onClick={() => selectModule(course.modules[course.modules.indexOf(module) + 1]!.id)}
            >
              Continuar no próximo módulo →
            </Button>
          ) : (
            <span className="course-finished">
              Percurso realizado · mantenha sua investigação aberta.
            </span>
          )}
        </div>
        {!saved?.completedAt && issues.length > 0 && (
          <details>
            <summary>O que falta para concluir?</summary>
            <ul>
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </details>
        )}
      </footer>
    </>
  );
}
