/**
 * PassageInspector — shown when no word is selected. Tabs scaffold the
 * future analysis surface; unpopulated areas use honest placeholders,
 * never invented academic content.
 */

import * as Tabs from "@radix-ui/react-tabs";
import { Link } from "@tanstack/react-router";
import { useWorkbench } from "../../lib/workbench/workbench-context";
import { SourceReferenceCard } from "../common/source-reference";

const TABS = ["Overview", "Cross Refs", "Language", "History", "Literature", "Notes", "Sources"] as const;

export function PassageInspector() {
  const { passageContext, notes } = useWorkbench();
  const label = passageContext ?? "No passage";

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <p className="meta-label">Passage Inspector</p>
        <p className="mt-1 font-serif text-lg font-semibold">{label}</p>
      </div>

      <Tabs.Root defaultValue="Overview" className="flex min-h-0 flex-1 flex-col">
        <Tabs.List className="flex gap-0.5 overflow-x-auto border-b border-border px-2 py-1.5" aria-label="Passage inspector sections">
          {TABS.map((tab) => (
            <Tabs.Trigger
              key={tab}
              value={tab}
              className="shrink-0 rounded px-2 py-1 font-mono text-[10px] tracking-wider text-muted-foreground uppercase transition-colors hover:text-foreground data-[state=active]:bg-accent data-[state=active]:text-foreground"
            >
              {tab}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <Tabs.Content value="Overview" className="space-y-4">
            <section>
              <h3 className="meta-label">Literary context</h3>
              <p className="mt-1 text-sm text-muted-foreground italic">
                Literary analysis is not bundled. Import commentaries or link your own notes.
              </p>
            </section>
            <section>
              <h3 className="meta-label">Historical context</h3>
              <p className="mt-1 text-sm text-muted-foreground italic">
                Historical background will be sourced from your library resources.
              </p>
            </section>
            <section>
              <h3 className="meta-label">Key terms</h3>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {passageContext?.startsWith("John") ? (
                  <Link
                    to="/knowledge"
                    search={{ entity: "ent-word-logos" }}
                    className="original-text rounded border border-border bg-muted/50 px-2 py-0.5 text-sm hover:bg-accent"
                  >
                    λόγος
                  </Link>
                ) : (
                  <span className="text-sm text-muted-foreground italic">
                    Select a word in the original text.
                  </span>
                )}
              </div>
            </section>
          </Tabs.Content>

          <Tabs.Content value="Cross Refs">
            {passageContext?.startsWith("John") ? (
              <ul className="space-y-1.5 text-sm">
                <li className="flex items-baseline justify-between gap-2">
                  <Link to="/scripture/$book/$chapter" params={{ book: "genesis", chapter: "1" }} className="font-mono text-xs underline-offset-2 hover:underline">
                    Genesis 1:1
                  </Link>
                  <span className="text-xs text-muted-foreground">“In the beginning” resonance</span>
                </li>
                <li className="flex items-baseline justify-between gap-2">
                  <span className="font-mono text-xs text-muted-foreground">Psalm 33:6</span>
                  <span className="text-xs text-muted-foreground">word / creation</span>
                </li>
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Cross-reference data is not imported for this passage (demo dataset).
              </p>
            )}
          </Tabs.Content>

          <Tabs.Content value="Language">
            <p className="text-sm text-muted-foreground italic">
              Switch the reader to <span className="not-italic font-medium text-foreground">Original</span> or{" "}
              <span className="not-italic font-medium text-foreground">Interlinear</span> and select a word
              to inspect morphology and lexical data.
            </p>
          </Tabs.Content>

          <Tabs.Content value="History">
            <p className="text-sm text-muted-foreground italic">
              Reception history, manuscripts and historical events linked to this passage will
              appear here as the Knowledge Graph grows.
            </p>
          </Tabs.Content>

          <Tabs.Content value="Literature">
            <p className="text-sm text-muted-foreground italic">
              Related literature (patristic, ancient Jewish, academic) will be listed from your
              library — nothing is invented here.
            </p>
          </Tabs.Content>

          <Tabs.Content value="Notes">
            {notes.filter((n) => n.links.some((l) => l.label.startsWith(label.split(" ")[0] ?? ""))).length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No notes for this passage yet.</p>
            ) : (
              <ul className="space-y-2">
                {notes
                  .filter((n) => n.links.some((l) => l.label.startsWith(label.split(" ")[0] ?? "")))
                  .map((n) => (
                    <li key={n.id} className="rounded-md border border-border bg-muted/30 p-2.5">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body || "—"}</p>
                    </li>
                  ))}
              </ul>
            )}
          </Tabs.Content>

          <Tabs.Content value="Sources" className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Editions currently rendering this passage:
            </p>
            <SourceReferenceCard
              source={{
                id: "src-web-passage",
                work: "World English Bible",
                location: label,
                year: 2020,
                resourceId: "res-web",
              }}
            />
            {passageContext?.startsWith("John") || passageContext?.startsWith("Genesis") ? (
              <SourceReferenceCard
                source={{
                  id: "src-wh-passage",
                  author: "Westcott & Hort",
                  work: "The New Testament in the Original Greek",
                  edition: "1881",
                  location: label,
                  year: 1881,
                  resourceId: "res-wh",
                }}
              />
            ) : null}
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
}
