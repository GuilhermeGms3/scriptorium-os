import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Download, Map, Network, Plus, Route as RouteIcon, Upload } from "lucide-react";
import { StudyLearningMap } from "../../components/study/study-learning-map";
import { ResearchWorkspaceService } from "../../lib/application/research-workspace-service";
import { formatNumber, t } from "../../lib/i18n";
import type { Study } from "../../lib/domain/study";
import { useWorkbench } from "../../lib/workbench/workbench-context";

type StudyView = "journey" | "investigations";

export const Route = createFileRoute("/study/")({
  head: () => ({ meta: [{ title: t("study.metaTitle") }] }),
  component: StudyIndex,
});

function StudyIndex() {
  const { studies, createStudy, refreshUserData, setPassageContext } = useWorkbench();
  const navigate = useNavigate();
  const [view, setView] = useState<StudyView>("journey");
  const [title, setTitle] = useState("");
  const [backupStatus, setBackupStatus] = useState<string>();
  useEffect(() => setPassageContext(null), [setPassageContext]);

  const createAndOpenStudy = async (studyTitle: string) => {
    const study = await createStudy(studyTitle);
    await navigate({ to: "/study/$slug", params: { slug: study.slug } });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const clean = title.trim();
    if (!clean) return;
    await createAndOpenStudy(clean);
  };

  return (
    <div className="min-h-full">
      <header className="border-b border-border bg-background px-5 py-4 md:px-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="meta-label">Formação e investigação</p>
            <h1 className="mt-1 font-serif text-2xl font-semibold">Árvore de estudos</h1>
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
              Percorra campos conectados, reúna fontes e desenvolva suas próprias investigações. O
              mapa mostra disponibilidade real do acervo — não progresso inventado.
            </p>
          </div>
          <div
            className="flex border border-input bg-card p-0.5"
            role="group"
            aria-label="Modo de estudo"
          >
            <button
              type="button"
              aria-pressed={view === "journey"}
              onClick={() => setView("journey")}
              className={`inline-flex h-8 items-center gap-1.5 px-2.5 text-xs ${
                view === "journey" ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              }`}
            >
              <RouteIcon className="size-3.5" /> Jornada
            </button>
            <Link
              to="/knowledge"
              className="inline-flex h-8 items-center gap-1.5 px-2.5 text-xs hover:bg-accent"
            >
              <Map className="size-3.5" /> Mapa livre
            </Link>
            <button
              type="button"
              aria-pressed={view === "investigations"}
              onClick={() => setView("investigations")}
              className={`inline-flex h-8 items-center gap-1.5 px-2.5 text-xs ${
                view === "investigations" ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              }`}
            >
              <Network className="size-3.5" /> Investigações
            </button>
          </div>
        </div>
      </header>

      {view === "journey" ? (
        <StudyLearningMap studies={studies} onStartPath={createAndOpenStudy} />
      ) : (
        <PersonalInvestigations
          studies={studies}
          title={title}
          backupStatus={backupStatus}
          onTitleChange={setTitle}
          onBackupStatus={setBackupStatus}
          onSubmit={submit}
          onRefresh={refreshUserData}
        />
      )}
    </div>
  );
}

function PersonalInvestigations({
  studies,
  title,
  backupStatus,
  onTitleChange,
  onBackupStatus,
  onSubmit,
  onRefresh,
}: {
  studies: readonly Study[];
  title: string;
  backupStatus: string | undefined;
  onTitleChange: (value: string) => void;
  onBackupStatus: (value: string) => void;
  onSubmit: (event: FormEvent) => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  return (
    <div className="mx-auto max-w-5xl px-5 py-6 md:px-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section aria-labelledby="personal-studies-title">
          <p className="meta-label">Seu trabalho</p>
          <h2 id="personal-studies-title" className="mt-1 font-serif text-xl font-semibold">
            Investigações pessoais
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            Estudos são workspaces locais: perguntas, passagens, fontes, notas e conclusões
            provisórias permanecem juntos e podem ser retomados.
          </p>

          <form onSubmit={(event) => void onSubmit(event)} className="mt-5 flex max-w-xl gap-2">
            <label className="min-w-0 flex-1">
              <span className="sr-only">{t("study.newTitle")}</span>
              <input
                value={title}
                onChange={(event) => onTitleChange(event.target.value)}
                placeholder="Ex.: O uso de Isaías no Evangelho de Mateus"
                className="h-9 w-full border border-input bg-background px-3 text-sm"
              />
            </label>
            <button
              className="inline-flex h-9 items-center gap-1.5 bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
              disabled={!title.trim()}
            >
              <Plus className="size-3.5" /> Criar
            </button>
          </form>

          <ul className="mt-7 divide-y divide-border border-y border-border">
            {studies.map((study) => (
              <li key={study.id}>
                <Link
                  to="/study/$slug"
                  params={{ slug: study.slug }}
                  className="group grid gap-1 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <span>
                    <span className="block text-sm font-medium">{study.title}</span>
                    <span className="mt-0.5 block max-w-2xl text-xs text-muted-foreground">
                      {study.description ?? t("study.localDescription")}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {formatNumber(study.items.length)} {t("common.items")}
                    <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {studies.length === 0 && (
            <div className="mt-6 border border-dashed border-border p-5">
              <p className="text-sm font-medium">Nenhuma investigação criada</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Volte à Jornada para iniciar por uma trilha com fontes ou crie uma pergunta própria
                acima.
              </p>
            </div>
          )}
        </section>

        <aside className="border-t border-border pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <p className="meta-label">Portabilidade</p>
          <h2 className="mt-1 text-sm font-medium">Backup do workspace</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            Exporte perguntas, notas e estudos antes de trocar de navegador, origem ou dispositivo.
          </p>
          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={() =>
                void ResearchWorkspaceService.exportJson().then((content) => {
                  const url = URL.createObjectURL(
                    new Blob([content], { type: "application/json" }),
                  );
                  const anchor = document.createElement("a");
                  anchor.href = url;
                  anchor.download = `scriptorium-estudos-${new Date().toISOString().slice(0, 10)}.json`;
                  anchor.click();
                  URL.revokeObjectURL(url);
                  onBackupStatus("Backup baixado.");
                })
              }
              className="inline-flex h-9 items-center gap-2 border border-input px-3 text-xs hover:bg-accent"
            >
              <Download className="size-3.5" /> Baixar backup
            </button>
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 border border-input px-3 text-xs hover:bg-accent">
              <Upload className="size-3.5" /> Restaurar backup
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void file
                    .text()
                    .then(ResearchWorkspaceService.importJson)
                    .then(async (result) => {
                      await onRefresh();
                      onBackupStatus(
                        `${result.studies} estudos, ${result.notes} notas e ${result.researchQuestions} perguntas processados.`,
                      );
                    })
                    .catch((error: unknown) =>
                      onBackupStatus(error instanceof Error ? error.message : String(error)),
                    );
                }}
              />
            </label>
          </div>
          {backupStatus && (
            <p role="status" className="mt-2 text-xs text-muted-foreground">
              {backupStatus}
            </p>
          )}
          <Link
            to="/library"
            className="mt-6 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            Consultar acervo <ArrowRight className="size-3" />
          </Link>
        </aside>
      </div>
    </div>
  );
}
