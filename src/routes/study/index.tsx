import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Download, Plus, Upload } from "lucide-react";
import { useWorkbench } from "../../lib/workbench/workbench-context";
import { formatNumber, t } from "../../lib/i18n";
import { ResearchWorkspaceService } from "../../lib/application/research-workspace-service";

export const Route = createFileRoute("/study/")({
  head: () => ({ meta: [{ title: t("study.metaTitle") }] }),
  component: StudyIndex,
});

function StudyIndex() {
  const { studies, createStudy, refreshUserData, setPassageContext } = useWorkbench();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [backupStatus, setBackupStatus] = useState<string>();
  useEffect(() => setPassageContext(null), [setPassageContext]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const clean = title.trim();
    if (!clean) return;
    const study = await createStudy(clean);
    await navigate({ to: "/study/$slug", params: { slug: study.slug } });
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-6 md:px-8">
      <header className="border-b border-border pb-3">
        <p className="meta-label">{t("study.section")}</p>
        <h1 className="mt-1 font-serif text-2xl font-semibold">{t("study.workspaces")}</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{t("study.description")}</p>
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            void ResearchWorkspaceService.exportJson().then((content) => {
              const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
              const anchor = document.createElement("a");
              anchor.href = url;
              anchor.download = `scriptorium-workspace-${new Date().toISOString().slice(0, 10)}.json`;
              anchor.click();
              URL.revokeObjectURL(url);
              setBackupStatus("Workspace exportado.");
            })
          }
          className="inline-flex h-8 items-center gap-1.5 rounded border border-input px-2.5 text-xs"
        >
          <Download className="size-3.5" /> Exportar workspace
        </button>
        <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded border border-input px-2.5 text-xs">
          <Upload className="size-3.5" /> Importar backup
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
                  await refreshUserData();
                  setBackupStatus(
                    `${result.studies} estudos, ${result.notes} notas e ${result.researchQuestions} perguntas processados.`,
                  );
                })
                .catch((error: unknown) =>
                  setBackupStatus(error instanceof Error ? error.message : String(error)),
                );
            }}
          />
        </label>
        {backupStatus && (
          <p role="status" className="self-center text-xs text-muted-foreground">
            {backupStatus}
          </p>
        )}
      </div>

      <form onSubmit={(event) => void submit(event)} className="mt-5 flex max-w-xl gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">{t("study.newTitle")}</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("study.newPlaceholder")}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </label>
        <button
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
          disabled={!title.trim()}
        >
          <Plus className="size-3.5" /> {t("common.create")}
        </button>
      </form>

      <ul className="mt-6 divide-y divide-border border-y border-border">
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
                {formatNumber(study.items.length)} {t("common.items")}{" "}
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
