/**
 * SourceReferenceCard — the reusable, source-first citation block.
 * Every claim, analysis, AI answer or graph edge should be able to point
 * back to one of these.
 */

import { ArrowUpRight, BookOpen } from "lucide-react";
import type { SourceReference } from "../../lib/domain/study";

export function SourceReferenceCard({ source }: { source: SourceReference }) {
  return (
    <figure className="rounded-md border border-border bg-muted/30 p-3">
      <figcaption className="meta-label">Source</figcaption>
      <div className="mt-1.5 flex items-start gap-2.5">
        <BookOpen className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
        <div className="min-w-0 text-sm">
          {source.author && <p className="text-foreground">{source.author}</p>}
          <p className="font-serif italic text-foreground/90">{source.work}</p>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            {[source.edition, source.location, source.year].filter(Boolean).join(" · ")}
          </p>
          {source.url && (
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Open resource <ArrowUpRight className="size-3" />
            </a>
          )}
        </div>
      </div>
    </figure>
  );
}
