import { FlaskConical, LibraryBig } from "lucide-react";
import type { PassageAnalysis, StudyLens } from "../../lib/domain/analysis";
import type { Availability } from "../../lib/domain/availability";
import { statusLabel, studyLensPresentation, t } from "../../lib/i18n";

export function AnalysisLenses({
  passageLabel,
  lenses,
  analyses,
}: {
  passageLabel: string;
  lenses: StudyLens[];
  analyses: Availability<PassageAnalysis[]>;
}) {
  return (
    <section aria-labelledby="analysis-lenses-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="meta-label">{t("scripture.interpretiveApparatus")}</p>
          <h2 id="analysis-lenses-title" className="mt-1 font-serif text-xl font-semibold">
            {t("scripture.studyThroughLenses", { passage: passageLabel })}
          </h2>
        </div>
        <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          {t("scripture.structureOnly")}
        </span>
      </div>
      <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">
        {t("scripture.lensesDisclaimer")}
      </p>

      <div className="mt-4 grid border-y border-border sm:grid-cols-2 xl:grid-cols-3">
        {lenses.map((lens) => {
          const lensAnalysis =
            analyses.status === "available"
              ? analyses.data.find((item) => item.lensId === lens.id)
              : undefined;
          const presentation = studyLensPresentation(lens);
          return (
            <article
              key={lens.id}
              className="border-b border-border p-3 sm:border-r xl:[&:nth-child(3n)]:border-r-0"
            >
              <div className="flex items-center gap-2">
                {lens.id === "scientific" ? (
                  <FlaskConical className="size-3.5 text-muted-foreground" />
                ) : (
                  <LibraryBig className="size-3.5 text-muted-foreground" />
                )}
                <h3 className="text-[13px] font-medium">{presentation.label}</h3>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {presentation.description}
              </p>
              <p className="mt-2 font-mono text-[10px] leading-relaxed text-foreground/75">
                {presentation.question}
              </p>
              <p className="mt-2 text-[10px] italic text-muted-foreground">
                {lensAnalysis?.summary ??
                  (analyses.status === "available"
                    ? t("scripture.noAnalysis")
                    : statusLabel(analyses.status))}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
