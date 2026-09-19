import { BookOpenCheck, Quote } from "lucide-react";
import type { PassageAnalysis } from "../../lib/domain/analysis";
import type { KnowledgeClaim, TextAnchor } from "../../lib/domain/knowledge";
import { reviewStatusLabel, studyLensPresentation } from "../../lib/i18n";
import { AnalysisRepository } from "../../lib/repositories/analysis-repository";

function passageAnchor(anchor: TextAnchor) {
  return anchor.type === "passage" ? anchor.ref : null;
}

function beginsAtVerse(anchor: TextAnchor, bookId: string, chapter: number, verse: number): boolean {
  const ref = passageAnchor(anchor);
  return Boolean(ref && ref.bookId === bookId && ref.chapter === chapter && (ref.verseStart ?? 1) === verse);
}

export function VerseExplanations({ bookId, chapter, verse, analyses, claims }: {
  bookId: string;
  chapter: number;
  verse: number;
  analyses: PassageAnalysis[];
  claims: KnowledgeClaim[];
}) {
  const verseAnalyses = analyses.filter((analysis) => beginsAtVerse(analysis.anchor, bookId, chapter, verse));
  const verseClaims = claims.filter((claim) => claim.anchors.some((anchor) => beginsAtVerse(anchor, bookId, chapter, verse)));
  if (!verseAnalyses.length && !verseClaims.length) return null;

  return (
    <aside className="mb-5 ml-4 border-l-2 border-primary/25 pl-3" aria-label={`Explicações do versículo ${verse}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        <BookOpenCheck className="size-3.5" /> Estudo da passagem
      </div>
      <div className="mt-2 space-y-2">
        {verseAnalyses.map((analysis) => {
          const lens = AnalysisRepository.listLenses().find((item) => item.id === analysis.lensId);
          const ref = passageAnchor(analysis.anchor);
          const range = ref?.verseEnd && ref.verseEnd !== ref.verseStart ? ` · abrange ${ref.verseStart}–${ref.verseEnd}` : "";
          return (
            <article key={analysis.id} className="rounded-md border border-border bg-muted/20 p-3">
              <p className="font-mono text-[10px] text-muted-foreground">
                {lens ? studyLensPresentation(lens).label : analysis.lensId}{range}
              </p>
              <h3 className="mt-1 text-sm font-medium">{analysis.title}</h3>
              {analysis.summary && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{analysis.summary}</p>}
              <p className="mt-2 font-mono text-[9px] text-muted-foreground">
                {reviewStatusLabel(analysis.reviewStatus)} · {analysis.status === "reviewed" ? "revisado" : "síntese em revisão"}
              </p>
            </article>
          );
        })}
        {verseClaims.map((claim) => (
          <article key={claim.id} className="flex gap-2 rounded-md border border-border/70 px-3 py-2">
            <Quote className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs leading-relaxed">{claim.proposition}</p>
              <p className="mt-1 font-mono text-[9px] text-muted-foreground">
                {claim.kind.replaceAll("-", " ")} · {reviewStatusLabel(claim.reviewStatus)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </aside>
  );
}
