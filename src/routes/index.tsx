import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, BookOpen, CalendarDays, FileText, Library, StickyNote } from "lucide-react";
import { useWorkbench } from "../lib/workbench/workbench-context";
import { LibraryRepository } from "../lib/repositories/library-repository";
import { ResearchAssistant } from "../components/common/research-assistant";
import { PageContainer } from "../components/layout/page-container";
import { PageHeader } from "../components/layout/page-header";
import { SectionHeader } from "../components/layout/section-header";
import {
  bookLabel,
  claimKindLabel,
  formatNumber,
  passageLabel,
  sourceTypeLabel,
  t,
} from "../lib/i18n";
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
    // The four most recently added or changed, not the first four of the whole catalog by title.
    void LibraryRepository.listSources({ orderBy: "recent", limit: 4 }).then(
      setRecentResources,
      () => setRecentResources([]),
    );
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

  const lensSummaries = (["exegetical", "hermeneutical", "historical"] as const).flatMap(
    (lensId) => {
      const analysis = dailyAnalyses.find((item) => item.lensId === lensId);
      return analysis ? [{ lensId, label: LENS_LABELS[lensId], summary: analysis.summary }] : [];
    },
  );
  const dailyClaim =
    dailyBundle && hasAvailableData(dailyBundle.claims) ? dailyBundle.claims.data[0] : undefined;
  const continueRef = {
    book: lastPosition?.bookId ?? dailyBundle?.identity.ref.bookId ?? "genesis",
    chapter: lastPosition?.chapter ?? dailyBundle?.identity.ref.chapter ?? 1,
  };

  return (
    <PageContainer className="today-inscriptions space-y-10">
      <PageHeader eyebrow={t("home.workspace")} title={t("home.resume")} />

      <div className="grid gap-4 md:grid-cols-3">
        <HomeCard icon={BookOpen} label={t("home.continueReading")}>
          <Link
            to="/scripture/$book/$chapter"
            params={{ book: continueRef.book, chapter: String(continueRef.chapter) }}
            className="group block focus-visible:outline-none"
          >
            <p className="font-serif text-xl font-semibold group-hover:underline">
              {bookLabel(continueRef.book)} {continueRef.chapter}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {lastPosition ? "Onde você parou." : "Uma sugestão para começar."}
            </p>
            <CardAction>Abrir a leitura</CardAction>
          </Link>
        </HomeCard>

        <HomeCard icon={CalendarDays} label="Passagem do dia">
          {dailyLoading ? (
            <p role="status" className="text-sm text-muted-foreground">
              Abrindo a passagem…
            </p>
          ) : dailyBundle && dailyVerse ? (
            <Link
              to="/scripture/$book/$chapter"
              params={{
                book: dailyBundle.identity.ref.bookId,
                chapter: String(dailyBundle.identity.ref.chapter),
              }}
              className="group block focus-visible:outline-none"
            >
              <p className="font-serif text-xl font-semibold group-hover:underline">
                {passageLabel(dailyBundle.identity.ref)}
              </p>
              <p className="mt-1 line-clamp-3 font-serif text-base leading-relaxed">
                {dailyText ? dailyVerse.translations[dailyText] : undefined}
              </p>
              <CardAction>Ler no contexto</CardAction>
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">
              A passagem do dia não pôde ser aberta neste computador.
            </p>
          )}
        </HomeCard>

        <HomeCard icon={FileText} label="Meus estudos">
          {recentStudy ? (
            <Link
              to="/study/$slug"
              params={{ slug: recentStudy.slug }}
              className="group block focus-visible:outline-none"
            >
              <p className="font-serif text-xl font-semibold group-hover:underline">
                {recentStudy.title}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatNumber(recentStudy.items.filter((i) => i.kind === "resource").length)}{" "}
                {t("home.sourcesLinked")} ·{" "}
                {formatNumber(recentStudy.items.filter((i) => i.kind === "passage").length)}{" "}
                {t("home.passages")}
              </p>
              <CardAction>Continuar o estudo</CardAction>
            </Link>
          ) : (
            <Link to="/study" className="group block focus-visible:outline-none">
              <p className="font-serif text-xl font-semibold group-hover:underline">
                Comece um estudo
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Escolha um tema na árvore de estudos e reúna passagens, fontes e notas.
              </p>
              <CardAction>Ver os temas</CardAction>
            </Link>
          )}
        </HomeCard>
      </div>

      {dailyBundle && (
        <section aria-labelledby="daily-study-title" className="space-y-3">
          <SectionHeader
            id="daily-study-title"
            title={`Para estudar ${passageLabel(dailyBundle.identity.ref)}`}
            description={new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date())}
          />
          {lensSummaries.length ? (
            <div className="grid gap-3 md:grid-cols-3">
              {lensSummaries.map((lens) => (
                <div key={lens.lensId} className="rounded-md border border-border p-3">
                  <p className="meta-label">{lens.label}</p>
                  <p className="mt-1 text-sm leading-relaxed">{lens.summary}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              O texto bíblico está disponível, mas ainda não há exegese, hermenêutica ou contexto
              histórico publicados para esta passagem.
            </p>
          )}
          {dailyClaim && (
            <blockquote className="border-l-2 border-primary/40 pl-3 text-sm leading-relaxed">
              {dailyClaim.proposition}
              <footer className="mt-1 text-xs text-muted-foreground">
                {claimKindLabel(dailyClaim.kind)}
              </footer>
            </blockquote>
          )}
          <p className="text-sm text-muted-foreground">
            {formatNumber(dailyAnalyses.length)} análises ·{" "}
            {formatNumber(
              dailyBundle && hasAvailableData(dailyBundle.claims)
                ? dailyBundle.claims.data.length
                : 0,
            )}{" "}
            afirmações · {formatNumber(dailyBundle.sources.references.length)} fontes citáveis ·{" "}
            <Link to="/study" className="text-primary underline-offset-4 hover:underline">
              abrir um guia de estudo
            </Link>
          </p>
        </section>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        <section aria-labelledby="recent-library-title" className="space-y-2">
          <SectionHeader
            id="recent-library-title"
            title={t("home.recentLibrary")}
            icon={<Library className="size-4 text-muted-foreground" aria-hidden="true" />}
          />
          {recentResources.length ? (
            <ul className="divide-y divide-border border-y border-border">
              {recentResources.map((resource) => (
                <li key={resource.id} className="flex items-baseline justify-between gap-3 py-2">
                  <Link
                    to="/library"
                    search={{ source: resource.id }}
                    className="min-w-0 flex-1 text-sm hover:underline"
                  >
                    {resource.title}
                  </Link>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {sourceTypeLabel(resource.sourceType)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma referência na biblioteca ainda.</p>
          )}
        </section>

        <section aria-labelledby="recent-notes-title" className="space-y-2">
          <SectionHeader
            id="recent-notes-title"
            title={t("home.recentNotes")}
            icon={<StickyNote className="size-4 text-muted-foreground" aria-hidden="true" />}
          />
          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("home.noNotes")}</p>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {notes.slice(0, 4).map((note) => (
                <li key={note.id} className="py-2">
                  <p className="text-sm font-medium">{note.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {note.links.map((link) => link.label).join(" · ") || t("home.unlinked")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <details className="rounded-md border border-border">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium hover:bg-accent/40">
          Assistente de pesquisa (experimental)
        </summary>
        <div className="border-t border-border p-4">
          <ResearchAssistant
            contextLabel={dailyBundle ? passageLabel(dailyBundle.identity.ref) : "Passagem do dia"}
          />
        </div>
      </details>
    </PageContainer>
  );
}

const LENS_LABELS = {
  exegetical: "Exegese",
  hermeneutical: "Hermenêutica",
  historical: "Contexto histórico",
} as const;

function HomeCard({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof BookOpen;
  label: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={label}
      className="rounded-lg border border-border bg-card p-4 transition-colors focus-within:ring-2 focus-within:ring-ring hover:border-primary/50"
    >
      <p className="flex items-center gap-1.5 meta-label">
        <Icon className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
        {label}
      </p>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function CardAction({ children }: { children: ReactNode }) {
  return (
    <span className="mt-3 inline-flex items-center gap-1 text-sm text-primary">
      {children}{" "}
      <ArrowRight
        className="size-3.5 transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </span>
  );
}
