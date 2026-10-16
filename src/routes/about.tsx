import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { REPLAY_INTRO_EVENT } from "../components/shell/intro-splash";
import { useWorkbench } from "../lib/workbench/workbench-context";
import { t } from "../lib/i18n";
import { PageContainer } from "../components/layout/page-container";
import { PageHeader } from "../components/layout/page-header";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: t("about.metaTitle") }] }),
  component: AboutPage,
});

function AboutPage() {
  const { setPassageContext } = useWorkbench();
  useEffect(() => setPassageContext(null), [setPassageContext]);
  return (
    <PageContainer width="narrow">
      <PageHeader
        eyebrow={t("common.about")}
        title="Scriptorium"
        description={t("about.tagline")}
      />
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
      <section className="mt-8 border-t border-border pt-5">
        <Button
          variant="outline"
          onClick={() => window.dispatchEvent(new Event(REPLAY_INTRO_EVENT))}
        >
          <Sparkles className="size-4" aria-hidden="true" /> Ver a abertura de novo
        </Button>
      </section>
    </PageContainer>
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
