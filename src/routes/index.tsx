import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, CalendarDays, FileText, Library, StickyNote } from "lucide-react";
import { useWorkbench } from "../lib/workbench/workbench-context";
import { LibraryRepository } from "../lib/repositories/library-repository";
import { ResearchAssistant } from "../components/common/research-assistant";
import { bookLabel, claimKindLabel, formatNumber, passageLabel, t } from "../lib/i18n";
import type { BibliographicSource } from "../lib/domain/bibliography";
import { ScriptureKnowledgeEngine } from "../lib/knowledge-engine/scripture-knowledge-engine";
import type { PassageKnowledgeBundle } from "../lib/domain/knowledge-bundle";
import { hasAvailableData } from "../lib/domain/availability";

const LAST_READING_KEY = "scriptorium:last-reading";

interface ReadingPosition {
  bookId: string;
  chapter: number;
}

function dayNumber(date = new Date()): number {
  return Math.floor(
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 86_400_000,
  );
}

function readLastPosition(): ReadingPosition | null {
  try {
    const value = JSON.parse(window.localStorage.getItem(LAST_READING_KEY) ?? "null") as unknown;
    if (
      value &&
      typeof value === "object" &&
      "bookId" in value &&
      typeof value.bookId === "string" &&
      "chapter" in value &&
      typeof value.chapter === "number"
    )
      return { bookId: value.bookId, chapter: value.chapter };
  } catch {
    // An invalid local preference must not block the home workspace.
  }
  return null;
}

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
  const [dailyBundle, setDailyBundle] = useState<PassageKnowledgeBundle | null>(null);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [lastPosition, setLastPosition] = useState<ReadingPosition | null>(null);
  useEffect(() => setPassageContext(null), [setPassageContext]);
  useEffect(() => {
    void LibraryRepository.listSources().then((sources) => setRecentResources(sources.slice(0, 4)));
  }, []);
  useEffect(() => setLastPosition(readLastPosition()), []);
  useEffect(() => {
    let active = true;
    const books = ScriptureKnowledgeEngine.listBooks().filter(
      (book) => ScriptureKnowledgeEngine.availableChapters(book.id).length > 0,
    );
    const sequence = books.flatMap((book) =>
      ScriptureKnowledgeEngine.availableChapters(book.id).map((chapter) => ({
        bookId: book.id,
        chapter,
      })),
    );
    const selected = sequence[dayNumber() % sequence.length];
    if (!selected) {
      setDailyLoading(false);
      return;
    }
    void ScriptureKnowledgeEngine.loadPassageKnowledgeBundle(selected)
      .then(async (chapterBundle) => {
        const verses = chapterBundle?.passage.verses ?? [];
        const verse = verses[dayNumber() % Math.max(verses.length, 1)]?.verse;
        if (!verse) return chapterBundle;
        return ScriptureKnowledgeEngine.loadPassageKnowledgeBundle({
          ...selected,
          verseStart: verse,
          verseEnd: verse,
        });
      })
      .then((bundle) => {
        if (active) setDailyBundle(bundle);
      })
      .finally(() => {
        if (active) setDailyLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const recentStudy = studies[0];
  const dailyVerse = dailyBundle?.passage.verses[0];
  const dailyText = dailyVerse
    ? (dailyBundle.texts.find((layer) => layer.language === "pt-BR")?.editionId ??
      dailyBundle.texts.find((layer) => layer.language === "pt")?.editionId ??
      dailyBundle.texts[0]?.editionId)
    : undefined;
  const dailyAnalyses =
    dailyBundle && hasAvailableData(dailyBundle.analyses) ? dailyBundle.analyses.data : [];

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
          <section className="border-y border-border py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <SectionHeading icon={CalendarDays} title="Passagem do dia" />
                <p className="mt-1 text-xs text-muted-foreground">
                  Uma passagem diferente do acervo instalado, com as camadas realmente disponíveis.
                </p>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">
                {new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date())}
              </span>
            </div>
            {dailyLoading ? (
              <p role="status" className="mt-4 text-sm text-muted-foreground">
                Abrindo a passagem no corpus local…
              </p>
            ) : dailyBundle && dailyVerse ? (
              <div className="mt-4 grid gap-4 md:grid-cols-[1.3fr_1fr]">
                <Link
                  to="/scripture/$book/$chapter"
                  params={{
                    book: dailyBundle.identity.ref.bookId,
                    chapter: String(dailyBundle.identity.ref.chapter),
                  }}
                  className="group border-l-2 border-primary pl-4"
                >
                  <p className="font-serif text-lg font-semibold">
                    {passageLabel(dailyBundle.identity.ref)}
                  </p>
                  <p className="mt-2 font-serif text-base leading-7">
                    {dailyText ? dailyVerse.translations[dailyText] : undefined}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs text-primary">
                    Ler no contexto <ArrowRight className="size-3" />
                  </span>
                </Link>
                <div className="space-y-2">
                  {["exegetical", "hermeneutical", "historical"].map((lensId) => {
                    const analysis = dailyAnalyses.find((item) => item.lensId === lensId);
                    const label =
                      lensId === "exegetical"
                        ? "Exegese"
                        : lensId === "hermeneutical"
                          ? "Hermenêutica"
                          : "Contexto histórico";
                    return (
                      <div key={lensId} className="rounded border border-border px-3 py-2">
                        <p className="meta-label">{label}</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {analysis?.summary ?? "Ainda sem análise curada para esta passagem."}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                O corpus diário não pôde ser aberto neste dispositivo.
              </p>
            )}
          </section>

          <section>
            <SectionHeading icon={BookOpen} title={t("home.continueReading")} />
            <Link
              to="/scripture/$book/$chapter"
              params={{
                book: lastPosition?.bookId ?? dailyBundle?.identity.ref.bookId ?? "genesis",
                chapter: String(lastPosition?.chapter ?? dailyBundle?.identity.ref.chapter ?? 1),
              }}
              className="group mt-2 block border-l-2 border-primary/60 pl-3 transition-colors hover:border-primary"
            >
              <p className="font-serif text-lg font-medium">
                {bookLabel(lastPosition?.bookId ?? dailyBundle?.identity.ref.bookId ?? "genesis")}{" "}
                {lastPosition?.chapter ?? dailyBundle?.identity.ref.chapter ?? 1}
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                {lastPosition ? t("home.lastPosition") : "Sugestão inicial do acervo"}
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
          <section className="rounded-lg border border-border bg-card p-3.5">
            <p className="meta-label">O que existe para a passagem</p>
            <dl className="mt-3 space-y-2 text-[13px]">
              <div className="flex items-center justify-between gap-3">
                <dt>Análises editoriais</dt>
                <dd className="font-mono text-xs">{dailyAnalyses.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Afirmações relacionadas</dt>
                <dd className="font-mono text-xs">
                  {dailyBundle && hasAvailableData(dailyBundle.claims)
                    ? dailyBundle.claims.data.length
                    : 0}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Fontes citáveis</dt>
                <dd className="font-mono text-xs">{dailyBundle?.sources.references.length ?? 0}</dd>
              </div>
            </dl>
            {dailyBundle && hasAvailableData(dailyBundle.claims) && dailyBundle.claims.data[0] ? (
              <div className="mt-3 border-t border-border pt-3">
                <p className="text-xs leading-relaxed">{dailyBundle.claims.data[0].proposition}</p>
                <p className="mt-1 font-mono text-[9px] uppercase text-muted-foreground">
                  {claimKindLabel(dailyBundle.claims.data[0].kind)}
                </p>
              </div>
            ) : (
              <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                O texto bíblico está disponível; uma síntese acadêmica ainda não foi publicada.
              </p>
            )}
            <Link
              to="/study"
              className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
            >
              Abrir guia de estudo <ArrowRight className="size-3" />
            </Link>
          </section>

          <ResearchAssistant
            contextLabel={dailyBundle ? passageLabel(dailyBundle.identity.ref) : "Passagem do dia"}
          />
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
