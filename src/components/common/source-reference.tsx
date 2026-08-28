/**
 * SourceReferenceCard — the reusable, source-first citation block.
 * Every claim, analysis, AI answer or graph edge should be able to point
 * back to one of these.
 */

import { ArrowUpRight, BookOpen } from "lucide-react";
import type { LibraryResource } from "../../lib/domain/library";
import type { SourceFragment, SourceReference } from "../../lib/domain/source";
import { languageLabel, provenanceLabel, statusLabel, t } from "../../lib/i18n";

export function SourceReferenceCard({
  source,
  fragment,
  resource,
}: {
  source: SourceReference;
  fragment?: SourceFragment | undefined;
  resource?: LibraryResource | undefined;
}) {
  return (
    <figure className="rounded-md border border-border bg-muted/30 p-3">
      <figcaption className="meta-label">{t("source.label")}</figcaption>
      <div className="mt-1.5 flex items-start gap-2.5">
        <BookOpen className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
        <div className="min-w-0 text-sm">
          {source.author && <p className="text-foreground">{source.author}</p>}
          <p className="font-serif italic text-foreground/90">{source.work}</p>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            {[source.edition, fragment?.locator, source.year].filter(Boolean).join(" · ")}
          </p>
          {source.language && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {t("common.language")}: {languageLabel(source.language)}
            </p>
          )}
          <p className="mt-1 flex flex-wrap gap-1 font-mono text-[9px] tracking-wider text-muted-foreground uppercase">
            {fragment && <span>{t(`source.${fragment.epistemicRole}`)}</span>}
            <span>
              {source.provenance.isDemo
                ? t("common.demo")
                : provenanceLabel(source.provenance.acquisition)}
            </span>
            <span>· {provenanceLabel(source.provenance.creationMethod)}</span>
            <span>
              ·{" "}
              {resource?.license?.status
                ? statusLabel(resource.license.status)
                : (resource?.license?.name ?? t("source.licenseUnknown"))}
            </span>
          </p>
          {source.url && (
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              {t("source.openResource")} <ArrowUpRight className="size-3" />
            </a>
          )}
        </div>
      </div>
    </figure>
  );
}
