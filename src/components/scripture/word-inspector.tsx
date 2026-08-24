/**
 * WordInspector — lemma, morphology, glosses, occurrences and sources for
 * the selected original-language token. Demo lexicon only; lemmas without
 * an imported entry render an explicit empty state.
 */

import * as Tabs from "@radix-ui/react-tabs";
import { ExternalLink, Plus, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useWorkbench, type WordSelection } from "../../lib/workbench/workbench-context";
import { ScriptureRepository } from "../../lib/repositories/scripture-repository";
import { SourceReferenceCard } from "../common/source-reference";
import { DEMO_SOURCES } from "../../lib/fixtures/study.fixture";

const TABS = ["Lexicon", "Morphology", "Occurrences", "Septuagint", "Semantic Domain", "Sources", "Notes"] as const;

export function WordInspector({ selection }: { selection: WordSelection }) {
  const { token, verseLabel } = selection;
  const { selectWord, studies, addToStudy } = useWorkbench();
  const entry = ScriptureRepository.getLexiconEntry(token.lemma);
  const occurrences = ScriptureRepository.getOccurrences(token.lemma);

  const morphRows: [string, string | undefined][] = [
    ["Part of speech", token.morphology.partOfSpeech],
    ["Case", token.morphology.case],
    ["Number", token.morphology.number],
    ["Gender", token.morphology.gender],
    ["Tense", token.morphology.tense],
    ["Voice", token.morphology.voice],
    ["Mood", token.morphology.mood],
    ["Person", token.morphology.person],
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="meta-label">Word · {verseLabel}</p>
          <p className="original-text mt-1 text-2xl leading-tight">{token.surface}</p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            {token.transliteration ?? token.lemma}
            {token.strongs && <span className="ml-2">Strong's {token.strongs}</span>}
          </p>
        </div>
        <button
          onClick={() => selectWord(null)}
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Close word inspector"
        >
          <X className="size-4" />
        </button>
      </div>

      <Tabs.Root defaultValue="Lexicon" className="flex min-h-0 flex-1 flex-col">
        <Tabs.List className="flex gap-0.5 overflow-x-auto border-b border-border px-2 py-1.5" aria-label="Word inspector sections">
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
          <Tabs.Content value="Lexicon" className="space-y-4">
            {entry ? (
              <>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="meta-label">Lemma</dt>
                    <dd className="original-text mt-0.5 text-lg">{entry.lemma}</dd>
                  </div>
                  <div>
                    <dt className="meta-label">Part of speech</dt>
                    <dd className="mt-0.5">{entry.partOfSpeech}</dd>
                  </div>
                  <div>
                    <dt className="meta-label">Possible senses</dt>
                    <dd className="mt-0.5 flex flex-wrap gap-1">
                      {entry.glosses.map((g) => (
                        <span key={g} className="rounded border border-border bg-muted/50 px-1.5 py-0.5 text-xs">
                          {g}
                        </span>
                      ))}
                    </dd>
                  </div>
                  {entry.lexicalSummary && (
                    <div>
                      <dt className="meta-label">Lexical summary</dt>
                      <dd className="mt-0.5 text-[13px] leading-relaxed text-foreground/85">
                        {entry.lexicalSummary}
                      </dd>
                    </div>
                  )}
                </dl>
                <Link
                  to="/knowledge"
                  search={{ entity: token.lemma === "λόγος" ? "ent-word-logos" : undefined }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                >
                  Explore word <ExternalLink className="size-3" />
                </Link>
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No lexicon entry imported for{" "}
                <span className="original-text not-italic">{token.lemma}</span> yet. Connect a
                licensed lexicon resource to populate this panel.
              </p>
            )}
          </Tabs.Content>

          <Tabs.Content value="Morphology">
            <table className="w-full text-sm">
              <tbody>
                {morphRows.filter(([, v]) => v).map(([k, v]) => (
                  <tr key={k} className="border-b border-border/60 last:border-0">
                    <td className="py-1.5 pr-3 font-mono text-[11px] text-muted-foreground">{k}</td>
                    <td className="py-1.5 capitalize">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {token.morphology.code && (
              <p className="mt-3 font-mono text-xs text-muted-foreground">
                Parsing code: <span className="text-foreground">{token.morphology.code}</span>
              </p>
            )}
          </Tabs.Content>

          <Tabs.Content value="Occurrences">
            {occurrences.length > 0 ? (
              <ul className="space-y-1">
                {occurrences.map((occ) => (
                  <li key={occ}>
                    <span className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-xs">{occ}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Occurrence index not yet built for this lemma (demo dataset).
              </p>
            )}
          </Tabs.Content>

          <Tabs.Content value="Septuagint">
            <p className="text-sm text-muted-foreground italic">
              Septuagint alignment will appear here once the LXX corpus is imported under a
              compatible license.
            </p>
          </Tabs.Content>

          <Tabs.Content value="Semantic Domain">
            <p className="text-sm text-muted-foreground italic">
              Semantic domain classification (e.g. Louw–Nida style domains) is planned; no data is
              bundled in this phase.
            </p>
          </Tabs.Content>

          <Tabs.Content value="Sources" className="space-y-3">
            {DEMO_SOURCES.filter((s) => s.location?.includes(token.lemma) || s.location === verseLabel).map(
              (s) => <SourceReferenceCard key={s.id} source={s} />,
            )}
            <SourceReferenceCard
              source={{
                id: "src-token",
                author: "Westcott & Hort",
                work: "The New Testament in the Original Greek",
                edition: "1881",
                location: verseLabel,
                year: 1881,
                resourceId: "res-wh",
              }}
            />
          </Tabs.Content>

          <Tabs.Content value="Notes">
            <WordNotes verseLabel={verseLabel} lemma={token.lemma} />
          </Tabs.Content>
        </div>
      </Tabs.Root>

      {/* Footer action */}
      <div className="border-t border-border px-4 py-2.5">
        <AddToStudy lemma={token.lemma} studies={studies} addToStudy={addToStudy} />
      </div>
    </div>
  );
}

function WordNotes({ verseLabel, lemma }: { verseLabel: string; lemma: string }) {
  const { notes, addNote } = useWorkbench();
  const linked = notes.filter((n) => n.links.some((l) => l.target === lemma || l.label === verseLabel));

  return (
    <div className="space-y-3">
      {linked.length === 0 && (
        <p className="text-sm text-muted-foreground italic">No notes linked to this word yet.</p>
      )}
      {linked.map((n) => (
        <div key={n.id} className="rounded-md border border-border bg-muted/30 p-2.5">
          <p className="text-sm font-medium">{n.title}</p>
          <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{n.body}</p>
        </div>
      ))}
      <button
        onClick={() =>
          addNote(`Note on ${lemma}`, "", [
            { kind: "word", target: lemma, label: lemma },
            { kind: "passage", target: verseLabel, label: verseLabel },
          ])
        }
        className="inline-flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
      >
        <Plus className="size-3.5" /> New note for this word
      </button>
    </div>
  );
}

function AddToStudy({
  lemma,
  studies,
  addToStudy,
}: {
  lemma: string;
  studies: ReturnType<typeof useWorkbench>["studies"];
  addToStudy: ReturnType<typeof useWorkbench>["addToStudy"];
}) {
  if (studies.length === 0) return null;
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="meta-label">Add to study</span>
      <select
        defaultValue=""
        onChange={(e) => {
          const id = e.target.value;
          if (!id) return;
          addToStudy(id, { kind: "word", refId: lemma, label: lemma });
          e.target.value = "";
        }}
        className="h-7 flex-1 rounded-md border border-input bg-background px-1.5 text-xs text-foreground"
      >
        <option value="" disabled>
          Choose a study…
        </option>
        {studies.map((s) => (
          <option key={s.id} value={s.id}>
            {s.title}
          </option>
        ))}
      </select>
    </label>
  );
}
