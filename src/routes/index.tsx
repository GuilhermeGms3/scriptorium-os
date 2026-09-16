import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, FileText, Library, StickyNote } from "lucide-react";
import { useWorkbench } from "../lib/workbench/workbench-context";
import { LibraryRepository } from "../lib/repositories/library-repository";
import {
  KnowledgeRepository,
  type KnowledgeSearchHit,
} from "../lib/repositories/knowledge-repository";
import { ResearchAssistant } from "../components/common/research-assistant";
import { bookLabel, formatNumber, morphologyLabel, t } from "../lib/i18n";
import type { BibliographicSource } from "../lib/domain/bibliography";

export const Route = createFileRoute("/")({
  head: () => {
    const title = t("home.metaTitle");
    const description = t("home.metaDescription");
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: Home,
});

function Home() {
  const { setPassageContext, studies, notes } = useWorkbench();
  const [recentResources, setRecentResources] = useState<BibliographicSource[]>([]);
  const [wordOfDay, setWordOfDay] = useState<KnowledgeSearchHit | null>(null);
  useEffect(() => setPassageContext(null), [setPassageContext]);
  useEffect(() => {
    void LibraryRepository.listSources().then((sources) => setRecentResources(sources.slice(0, 4)));
  }, []);
  useEffect(() => {
    void KnowledgeRepository.search("G3056", 10).then((hits) => {
      setWordOfDay(hits.find((hit) => hit.kind === "lexeme") ?? null);
    });
  }, []);
  const recentStudy = studies[0];

  return (
    <div className="mx-auto max-w-5xl px-5 py-6 md:px-8">
      <header className="border-b border-border pb-3">
        <p className="meta-label">{t("home.workspace")}</p>
        <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight">
          {t("home.resume")}
        </h1>
      </header>

      <div className="mt-5 grid gap-x-8 gap-y-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          {/* Continue reading */}
          <section>
            <SectionHeading icon={BookOpen} title={t("home.continueReading")} />
            <Link
              to="/scripture/$book/$chapter"
              params={{ book: "john", chapter: "1" }}
              className="group mt-2 block border-l-2 border-primary/60 pl-3 transition-colors hover:border-primary"
            >
              <p className="font-serif text-lg font-medium">{bookLabel("john")} 1</p>
              <p className="mt-0.5 line-clamp-2 font-serif text-sm text-muted-foreground">
                In the beginning was the Word, and the Word was with God, and the Word was God.
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                {t("home.lastPosition")}: v.1 · World English Bible
                <ArrowRight className="ml-1 inline size-3 transition-transform group-hover:translate-x-0.5" />
              </p>
            </Link>
          </section>

          {/* Continue studying */}
          <section>
            <SectionHeading icon={FileText} title={t("home.continueStudying")} />
            {recentStudy ? (
              <Link
                to="/study/$slug"
                params={{ slug: recentStudy.slug }}
                className="group mt-2 block border-l-2 border-border pl-3 transition-colors hover:border-primary/60"
              >
                <p className="text-[15px] font-medium">{recentStudy.title}</p>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  {formatNumber(recentStudy.items.filter((i) => i.kind === "resource").length)}{" "}
                  {t("home.sourcesLinked")} · {formatNumber(notes.length)} {t("home.notes")} ·{" "}
                  {formatNumber(recentStudy.items.filter((i) => i.kind === "passage").length)}{" "}
                  {t("home.passages")}
                </p>
              </Link>
            ) : null}
          </section>

          {/* Recent library */}
          <section>
            <SectionHeading icon={Library} title={t("home.recentLibrary")} />
            <ul className="mt-2 divide-y divide-border border-y border-border">
              {recentResources.map((r) => (
                <li key={r.id} className="flex items-baseline justify-between gap-3 py-1.5">
                  <Link
                    to="/library"
                    search={{ source: r.id }}
                    className="min-w-0 flex-1 text-[13px] hover:underline"
                  >
                    {r.title}
                  </Link>
                  <span className="shrink-0 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                    {r.sourceType.replaceAll("-", " ")}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Recent notes */}
          <section>
            <SectionHeading icon={StickyNote} title={t("home.recentNotes")} />
            {notes.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">{t("home.noNotes")}</p>
            ) : (
              <ul className="mt-2 divide-y divide-border border-y border-border">
                {notes.slice(0, 4).map((n) => (
                  <li key={n.id} className="py-1.5">
                    <p className="text-[13px] font-medium">{n.title}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {n.links.map((l) => l.label).join(" · ") || t("home.unlinked")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          {/* Word of the day */}
          <section className="rounded-lg border border-border bg-card p-3.5">
            <p className="meta-label">{t("home.wordOfDay")}</p>
            <p className="original-text mt-1.5 text-3xl leading-tight">{wordOfDay?.label ?? "—"}</p>
            <p className="font-mono text-xs text-muted-foreground">{wordOfDay?.detail}</p>
            <dl className="mt-3 space-y-1.5 text-[13px]">
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                  {t("home.lemma")}
                </dt>
                <dd className="original-text">{wordOfDay?.label ?? "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                  {t("home.wordClass")}
                </dt>
                <dd>{wordOfDay ? morphologyLabel("noun") : t("common.notAvailable")}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                  {t("home.senses")}
                </dt>
                <dd className="text-foreground/85">{t("home.lexicalSensePending")}</dd>
              </div>
            </dl>
            <Link
              to="/knowledge"
              search={{ entity: "entity:concept:logos" }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
            >
              {t("home.exploreWord")} <ArrowRight className="size-3" />
            </Link>
            <p className="mt-2.5 text-[10px] leading-relaxed text-muted-foreground">
              {t("home.demoLexicon")}
            </p>
          </section>

          <ResearchAssistant contextLabel={`${bookLabel("john")} 1:1`} />
        </aside>
      </div>
    </div>
  );
}

function SectionHeading({ icon: Icon, title }: { icon: typeof BookOpen; title: string }) {
  return (
    <h2 className="flex items-center gap-1.5">
      <Icon className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
      <span className="meta-label">{title}</span>
    </h2>
  );
}
