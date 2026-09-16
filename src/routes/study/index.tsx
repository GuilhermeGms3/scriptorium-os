import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, BookOpen, Download, Plus, Search, StickyNote, Upload } from "lucide-react";
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

      <ol className="mt-5 grid gap-3 sm:grid-cols-3" aria-label="Como usar a área de estudos">
        {[
          {
            icon: Search,
            heading: "1. Defina uma pergunta",
            description: "Comece por uma dúvida real que você deseja investigar.",
          },
          {
            icon: BookOpen,
            heading: "2. Reúna o material",
            description: "Adicione passagens e fontes enquanto navega pelo Scriptorium.",
          },
          {
            icon: StickyNote,
            heading: "3. Registre conclusões",
            description: "Escreva notas e diferencie observações de deduções.",
          },
        ].map(({ icon: Icon, heading, description }) => (
          <li key={heading} className="rounded-md border border-border bg-card p-3">
            <Icon className="size-4 text-primary" />
            <p className="mt-2 text-sm font-medium">{heading}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
          </li>
        ))}
      </ol>

      <form onSubmit={(event) => void submit(event)} className="mt-6 flex max-w-xl gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">{t("study.newTitle")}</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: O Logos em João 1"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </label>
        <button
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
          disabled={!title.trim()}
        >
          <Plus className="size-3.5" /> Criar estudo
        </button>
      </form>

      <details className="mt-4 max-w-xl rounded-md border border-border px-3 py-2">
        <summary className="cursor-pointer text-xs font-medium">Backup e restauração</summary>
        <p className="mt-2 text-xs text-muted-foreground">
          Baixe uma cópia dos seus estudos ou restaure um arquivo salvo anteriormente.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              void ResearchWorkspaceService.exportJson().then((content) => {
                const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = `scriptorium-estudos-${new Date().toISOString().slice(0, 10)}.json`;
                anchor.click();
                URL.revokeObjectURL(url);
                setBackupStatus("Backup baixado.");
              })
            }
            className="inline-flex h-8 items-center gap-1.5 rounded border border-input px-2.5 text-xs"
          >
            <Download className="size-3.5" /> Baixar backup
          </button>
          <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded border border-input px-2.5 text-xs">
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
        </div>
        {backupStatus && (
          <p role="status" className="mt-2 text-xs text-muted-foreground">
            {backupStatus}
          </p>
        )}
      </details>

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
      {studies.length === 0 && (
        <p className="mt-6 rounded-md border border-dashed border-border p-5 text-sm text-muted-foreground">
          Você ainda não criou um estudo. Dê um nome ao primeiro tema acima; depois, ao ler uma
          passagem ou fonte, use a ação de adicionar ao estudo.
        </p>
      )}
    </div>
  );
}
