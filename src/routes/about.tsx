import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useWorkbench } from "../lib/workbench/workbench-context";
import { t } from "../lib/i18n";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: t("about.metaTitle") }] }),
  component: AboutPage,
});

function AboutPage() {
  const { setPassageContext } = useWorkbench();
  useEffect(() => setPassageContext(null), [setPassageContext]);
  return (
    <article className="mx-auto max-w-3xl px-5 py-8 md:px-8">
      <p className="meta-label">{t("common.about")}</p>
      <h1 className="mt-1 font-serif text-3xl font-semibold">Scriptorium</h1>
      <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {t("about.tagline")}
      </p>
      <p className="mt-6 font-serif text-lg leading-relaxed">{t("about.intro")}</p>
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <Info title={t("about.whatIs")} text={t("about.whatIsText")} />
        <Info title={t("about.whatNot")} text={t("about.whatNotText")} />
        <Info title={t("about.epistemic")} text={t("about.epistemicText")} />
        <Info title={t("about.phase")} text={t("about.phaseText")} />
      </div>
      <section className="mt-8 border-t border-border pt-5">
        <h2 className="meta-label">{t("about.perspectives")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t("about.perspectivesText")}
        </p>
      </section>
    </article>
  );
}
function Info({ title, text }: { title: string; text: string }) {
  return (
    <section>
      <h2 className="meta-label">{title}</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
    </section>
  );
}
