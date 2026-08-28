/**
 * WordInspector — lemma, morphology, glosses, occurrences and sources for
 * the selected original-language token. SBLGNT uses the separate TAGNT layer;
 * legacy demo entries and missing analyses remain explicitly distinguished.
 */

import * as Tabs from "@radix-ui/react-tabs";
import { useEffect, useState } from "react";
import { ExternalLink, Plus, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useWorkbench, type WordSelection } from "../../lib/workbench/workbench-context";
import { ScriptureRepository } from "../../lib/repositories/scripture-repository";
import { SourceReferenceCard } from "../common/source-reference";
import { ScriptureKnowledgeEngine } from "../../lib/knowledge-engine/scripture-knowledge-engine";
import { passageRefKey } from "../../lib/domain/scripture";
import { localizePassageReference, morphologyLabel, t } from "../../lib/i18n";
import { LinguisticRepository } from "../../lib/repositories/linguistic-repository";
import type { LinguisticPassage } from "../../lib/domain/linguistic";
import { LexicalOccurrences } from "./lexical-occurrences";

const TABS = [
  { id: "lexicon", label: t("scripture.tab.lexicon") },
  { id: "morphology", label: t("scripture.tab.morphology") },
  { id: "occurrences", label: t("scripture.tab.occurrences") },
  { id: "septuagint", label: t("scripture.tab.septuagint") },
  { id: "semantic-domain", label: t("scripture.tab.semanticDomain") },
  { id: "sources", label: t("scripture.tab.sources") },
  { id: "notes", label: t("scripture.tab.notes") },
] as const;

export function WordInspector({ selection }: { selection: WordSelection }) {
  const { token, verseLabel } = selection;
  const { selectWord, studies, addToStudy } = useWorkbench();
  const [retry, setRetry] = useState(0);
  const [linguisticState, setLinguisticState] = useState<{
    tokenId: string;
    passage?: LinguisticPassage | null;
    error?: string;
  } | null>(null);
  useEffect(() => {
    if (token.editionId !== "sblgnt-1.2") return;
    let active = true;
    ScriptureKnowledgeEngine.loadLinguisticPassage(token.ref).then(
      (passage) => {
        if (active) setLinguisticState({ tokenId: token.id, passage });
      },
      () => {
        if (active)
          setLinguisticState({
            tokenId: token.id,
            error: "Não foi possível carregar a análise linguística.",
          });
      },
    );
    return () => {
      active = false;
    };
  }, [token.id, token.editionId, token.ref, retry]);
  const state = linguisticState?.tokenId === token.id ? linguisticState : null;
  const annotation = state?.passage?.annotations.find((item) => item.targetTokenId === token.id);
  const alignment = state?.passage?.alignments.find((item) => item.targetTokenId === token.id);
  const dataset = LinguisticRepository.getDataset();
  const artifact = dataset.artifacts.find(
    (item) => item.id === annotation?.provenance.sourceArtifactId,
  );
  const wordLabel = annotation?.normalized.lemmas.join(", ") ?? token.lemma ?? token.surface;
  const wordId = annotation?.normalized.lexemeId ?? token.lemmaId ?? token.id;
  const entry = token.lemma ? ScriptureRepository.getLexiconEntry(token.lemma) : null;
  const occurrences = token.lemma ? ScriptureRepository.getOccurrences(token.lemma) : [];
  const bundle = ScriptureKnowledgeEngine.getPassageKnowledgeBundle(token.ref);

  const analyses =
    annotation?.normalized.morphology.map((item) => ({
      ...item.features,
      code: item.rawMorphologyCode,
    })) ?? (token.morphology ? [token.morphology] : []);
  const morphRows: [string, string | undefined][] = analyses.flatMap(
    (morph, index) =>
      [
        ["Código original" + (analyses.length > 1 ? ` (${index + 1})` : ""), morph.code],
        [t("scripture.morph.partOfSpeech"), morph.partOfSpeech],
        [t("scripture.morph.case"), morph.case],
        [t("scripture.morph.number"), morph.number],
        [t("scripture.morph.gender"), morph.gender],
        [t("scripture.morph.tense"), morph.tense],
        [t("scripture.morph.voice"), morph.voice],
        [t("scripture.morph.mood"), morph.mood],
        [t("scripture.morph.person"), morph.person],
      ] as [string, string | undefined][],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="meta-label">{t("scripture.wordAt", { passage: verseLabel })}</p>
          <p className="original-text mt-1 text-2xl leading-tight">{token.surface}</p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            {annotation?.normalized.transliteration ??
              token.transliteration ??
              token.lemma ??
              t("scripture.surfaceForm")}
            {token.strongs && <span className="ml-2">Strong's {token.strongs}</span>}
          </p>
        </div>
        <button
          onClick={() => selectWord(null)}
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={t("scripture.word.close")}
        >
          <X className="size-4" />
        </button>
      </div>

      <Tabs.Root defaultValue="lexicon" className="flex min-h-0 flex-1 flex-col">
        <Tabs.List
          className="flex gap-0.5 overflow-x-auto border-b border-border px-2 py-1.5"
          aria-label={t("scripture.word.sections")}
        >
          {TABS.map((tab) => (
            <Tabs.Trigger
              key={tab.id}
              value={tab.id}
              className="shrink-0 rounded px-2 py-1 font-mono text-[10px] tracking-wider text-muted-foreground uppercase transition-colors hover:text-foreground data-[state=active]:bg-accent data-[state=active]:text-foreground"
            >
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {token.editionId === "sblgnt-1.2" && (
            <div className="mb-4 rounded border border-border bg-muted/30 p-2 text-xs">
              <p>Texto: SBLGNT · Análise: STEPBible TAGNT</p>
              {!state ? (
                <p role="status">Carregando análise…</p>
              ) : state.error ? (
                <p role="alert">
                  {state.error}{" "}
                  <button
                    className="underline"
                    onClick={() => {
                      setLinguisticState(null);
                      setRetry((n) => n + 1);
                    }}
                  >
                    Tentar novamente
                  </button>
                </p>
              ) : (
                <p>
                  Alinhamento:{" "}
                  {alignment
                    ? {
                        exact: "exato",
                        normalized: "normalizado",
                        positional: "posicional / variante editorial",
                        ambiguous: "ambíguo — sem análise atribuída",
                        unmatched: "sem correspondência — sem análise atribuída",
                      }[alignment.status]
                    : "indisponível"}
                </p>
              )}
            </div>
          )}
          <Tabs.Content value="lexicon" className="space-y-4">
            {annotation ? (
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="meta-label">Lema(s) fornecido(s) pelo TAGNT</dt>
                  <dd className="original-text mt-1 text-lg">{wordLabel}</dd>
                </div>
                <div>
                  <dt className="meta-label">Identificação lexical</dt>
                  <dd className="mt-1 space-y-1">
                    {annotation.normalized.lexicalReferences.map((ref) => (
                      <p key={`${ref.system}:${ref.value}`}>
                        {ref.system === "strong"
                          ? "Strong"
                          : "Strong estendido / desambiguado (STEP)"}
                        : <span className="font-mono">{ref.value}</span>
                      </p>
                    ))}
                  </dd>
                </div>
                {annotation.normalized.transliteration && (
                  <div>
                    <dt className="meta-label">Transliteração da forma TAGNT</dt>
                    <dd>
                      {annotation.normalized.transliteration}{" "}
                      <span className="text-xs text-muted-foreground">
                        — fornecida pela fonte; não é pronúncia
                      </span>
                    </dd>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Glossas, definições e interpretações não foram importadas nesta camada.
                </p>
              </dl>
            ) : entry ? (
              <>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="meta-label">{t("scripture.lemma")}</dt>
                    <dd className="original-text mt-0.5 text-lg">{entry.lemma}</dd>
                  </div>
                  <div>
                    <dt className="meta-label">{t("scripture.partOfSpeech")}</dt>
                    <dd className="mt-0.5">{morphologyLabel(entry.partOfSpeech)}</dd>
                  </div>
                  <div>
                    <dt className="meta-label">{t("scripture.possibleSenses")}</dt>
                    <dd className="mt-0.5 flex flex-wrap gap-1">
                      {entry.glosses.map((g) => (
                        <span
                          key={g}
                          className="rounded border border-border bg-muted/50 px-1.5 py-0.5 text-xs"
                        >
                          {g}
                        </span>
                      ))}
                    </dd>
                  </div>
                  {entry.lexicalSummary && (
                    <div>
                      <dt className="meta-label">{t("scripture.lexicalSummary")}</dt>
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
                  {t("scripture.exploreWord")} <ExternalLink className="size-3" />
                </Link>
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                {t("scripture.lexiconMissing", { lemma: wordLabel })}
              </p>
            )}
          </Tabs.Content>

          <Tabs.Content value="morphology">
            <table className="w-full text-sm">
              <tbody>
                {morphRows
                  .filter(([, v]) => v)
                  .map(([k, v], index) => (
                    <tr key={`${k}:${index}`} className="border-b border-border/60 last:border-0">
                      <td className="py-1.5 pr-3 font-mono text-[11px] text-muted-foreground">
                        {k}
                      </td>
                      <td className="py-1.5 capitalize">{v ? morphologyLabel(v) : v}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {morphRows.every(([, value]) => !value) && (
              <p className="text-sm text-muted-foreground italic">
                {t("scripture.morphologyNotSupplied")}
              </p>
            )}
            {annotation?.normalized.morphology.map((analysis, index) => (
              <dl
                key={`${analysis.rawMorphologyCode}:${index}`}
                className="mt-2 text-xs text-muted-foreground"
              >
                {Object.entries(analysis.extras).map(([key, value]) => (
                  <div key={key}>
                    {morphologyLabel(key)}: {morphologyLabel(value)}
                  </div>
                ))}
              </dl>
            ))}
            {token.morphology?.code && (
              <p className="mt-3 font-mono text-xs text-muted-foreground">
                {t("scripture.parsingCode")}:{" "}
                <span className="text-foreground">{token.morphology.code}</span>
              </p>
            )}
          </Tabs.Content>

          <Tabs.Content value="occurrences">
            {annotation?.normalized.lexemeId ? (
              <LexicalOccurrences
                key={annotation.normalized.lexemeId}
                lexemeId={annotation.normalized.lexemeId}
              />
            ) : occurrences.length > 0 ? (
              <ul className="space-y-1">
                {occurrences.map((occ) => (
                  <li key={occ}>
                    <span className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-xs">
                      {localizePassageReference(occ)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                {t("scripture.occurrenceMissing")}
              </p>
            )}
          </Tabs.Content>

          <Tabs.Content value="septuagint">
            <p className="text-sm text-muted-foreground italic">{t("scripture.lxxAwaiting")}</p>
          </Tabs.Content>

          <Tabs.Content value="semantic-domain">
            <p className="text-sm text-muted-foreground italic">
              {t("scripture.semanticAwaiting")}
            </p>
          </Tabs.Content>

          <Tabs.Content value="sources" className="space-y-3">
            {annotation && artifact && (
              <div className="space-y-2 rounded border border-border p-3 text-xs">
                <p className="font-medium">Texto: SBLGNT · Análise linguística: TAGNT</p>
                <a
                  className="underline"
                  href={`${artifact.repository}/blob/${dataset.sourceRevision}/${artifact.sourcePath.split("/").map(encodeURIComponent).join("/")}#L${annotation.provenance.sourceLine}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Registro original, linha {annotation.provenance.sourceLine}
                </a>
                <p>{dataset.attribution}</p>
                <details>
                  <summary className="cursor-pointer">Rastreabilidade e valores originais</summary>
                  <dl className="mt-2 space-y-2 break-all">
                    <dt>Token SBLGNT</dt>
                    <dd>{token.id}</dd>
                    <dt>Registro TAGNT</dt>
                    <dd>{annotation.sourceRecordId}</dd>
                    <dt>Commit</dt>
                    <dd>{dataset.sourceRevision}</dd>
                    <dt>SHA-256 do arquivo</dt>
                    <dd>{artifact.checksum.value}</dd>
                    <dt>Forma original TAGNT</dt>
                    <dd>{annotation.raw.greek}</dd>
                    <dt>Gramática original</dt>
                    <dd>{annotation.raw.lexicalGrammar}</dd>
                    <dt>Edições</dt>
                    <dd>{annotation.raw.editions}</dd>
                    <dt>Evidência do alinhamento</dt>
                    <dd>{annotation.alignment.evidence}</dd>
                  </dl>
                </details>
              </div>
            )}
            {alignment && !annotation && (
              <p className="text-xs text-muted-foreground">
                Nenhuma análise atribuída. Motivo auditável: {alignment.evidence}. Candidatos:{" "}
                {alignment.candidateSourceRecordIds.length}.
              </p>
            )}
            {bundle?.sources.references.map((source) => {
              const fragment = bundle.sources.fragments.find(
                (item) =>
                  item.sourceId === source.id &&
                  (item.locator.includes(wordLabel) || item.passage !== undefined),
              );
              const resource = bundle.sources.resources.find(
                (item) => item.id === source.resourceId,
              );
              if (!fragment) return null;
              return (
                <SourceReferenceCard
                  key={`${source.id}:${fragment.id}`}
                  source={source}
                  fragment={fragment}
                  resource={resource}
                />
              );
            })}
            {(!bundle || bundle.sources.references.length === 0) && (
              <p className="text-sm text-muted-foreground italic">
                {t("scripture.sourceFragmentMissing")}
              </p>
            )}
          </Tabs.Content>

          <Tabs.Content value="notes">
            <WordNotes
              verseLabel={verseLabel}
              wordId={wordId}
              wordLabel={wordLabel}
              passageRef={token.ref}
            />
          </Tabs.Content>
        </div>
      </Tabs.Root>

      {/* Footer action */}
      <div className="border-t border-border px-4 py-2.5">
        <AddToStudy
          wordId={wordId}
          wordLabel={wordLabel}
          studies={studies}
          addToStudy={addToStudy}
        />
      </div>
    </div>
  );
}

function WordNotes({
  verseLabel,
  wordId,
  wordLabel,
  passageRef,
}: {
  verseLabel: string;
  wordId: string;
  wordLabel: string;
  passageRef: WordSelection["token"]["ref"];
}) {
  const { notes, addNote } = useWorkbench();
  const linked = notes.filter((n) =>
    n.links.some((l) => l.target === wordId || l.label === wordLabel || l.label === verseLabel),
  );

  return (
    <div className="space-y-3">
      {linked.length === 0 && (
        <p className="text-sm text-muted-foreground italic">{t("scripture.noNotesForWord")}</p>
      )}
      {linked.map((n) => (
        <div key={n.id} className="rounded-md border border-border bg-muted/30 p-2.5">
          <p className="text-sm font-medium">{n.title}</p>
          <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{n.body}</p>
        </div>
      ))}
      <button
        onClick={() =>
          addNote(t("scripture.noteOn", { lemma: wordLabel }), "", [
            { kind: "word", target: wordId, label: wordLabel },
            {
              kind: "passage",
              target: passageRefKey(passageRef),
              label: verseLabel,
              anchor: { type: "passage", ref: passageRef },
            },
          ])
        }
        className="inline-flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
      >
        <Plus className="size-3.5" /> {t("scripture.newWordNote")}
      </button>
    </div>
  );
}

function AddToStudy({
  wordId,
  wordLabel,
  studies,
  addToStudy,
}: {
  wordId: string;
  wordLabel: string;
  studies: ReturnType<typeof useWorkbench>["studies"];
  addToStudy: ReturnType<typeof useWorkbench>["addToStudy"];
}) {
  if (studies.length === 0) return null;
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="meta-label">{t("scripture.addToStudy")}</span>
      <select
        defaultValue=""
        onChange={(e) => {
          const id = e.target.value;
          if (!id) return;
          addToStudy(id, { kind: "word", refId: wordId, label: wordLabel });
          e.target.value = "";
        }}
        className="h-7 flex-1 rounded-md border border-input bg-background px-1.5 text-xs text-foreground"
      >
        <option value="" disabled>
          {t("common.chooseStudy")}
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
