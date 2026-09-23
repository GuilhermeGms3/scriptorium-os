/**
 * WordInspector — lemma, morphology, glosses, occurrences and sources for
 * the selected original-language token. SBLGNT uses the separate TAGNT layer;
 * legacy demo entries and missing analyses remain explicitly distinguished.
 */

import * as Tabs from "@radix-ui/react-tabs";
import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { useWorkbench, type WordSelection } from "../../lib/workbench/workbench-context";
import { SourceReferenceCard } from "../common/source-reference";
import { ScriptureKnowledgeEngine } from "../../lib/knowledge-engine/scripture-knowledge-engine";
import { passageRefKey } from "../../lib/domain/scripture";
import { morphologyLabel, t } from "../../lib/i18n";
import type { WordKnowledgeBundle } from "../../lib/domain/knowledge-bundle";
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
    bundle?: WordKnowledgeBundle;
    error?: string;
  } | null>(null);
  useEffect(() => {
    let active = true;
    ScriptureKnowledgeEngine.getWordKnowledgeBundle(token).then(
      (bundle) => {
        if (active) setLinguisticState({ tokenId: token.id, bundle });
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
  }, [token, retry]);
  const state = linguisticState?.tokenId === token.id ? linguisticState : null;
  const wordBundle = state?.bundle;
  const annotation =
    wordBundle?.annotation.status === "available" ? wordBundle.annotation.data : undefined;
  const alignment =
    wordBundle?.alignment.status === "available" ? wordBundle.alignment.data : undefined;
  const wordLabel = annotation?.normalized.lemmas.join(", ") ?? token.lemma ?? token.surface;
  const wordId = annotation?.normalized.lexemeId ?? token.lemmaId ?? token.id;
  const isTagnt = token.editionId === "sblgnt-1.2";

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
        ["Estado", morph.state],
        ["Conjugação", morph.stem],
        ["Forma verbal", morph.aspect],
        ["Subtipo", morph.subtype],
        ["Prefixos", morph.prefixes],
        ["Sufixo", morph.suffixDescription],
        ["Estado da análise", morph.status],
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
            {token.strongs && (
              <span className="ml-2">
                {isTagnt ? "Strong's" : "Referência OSHB"} {token.strongs}
              </span>
            )}
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
                    : (wordBundle?.alignment.reason ?? "indisponível")}
                </p>
              )}
            </div>
          )}
          <Tabs.Content value="lexicon" className="space-y-4">
            {wordBundle?.dictionary.status === "available" &&
              wordBundle.dictionary.data.map((entry) => (
                <article key={entry.id} className="space-y-2 rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <h3 className="original-text text-lg">{entry.lemma}</h3>
                    {entry.transliteration && (
                      <span className="font-mono text-xs text-muted-foreground">
                        {entry.transliteration}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="meta-label">Glosa breve da fonte (em inglês)</p>
                    <p className="mt-1 font-medium">{entry.gloss}</p>
                  </div>
                  {entry.definition && (
                    <div>
                      <p className="meta-label">Definição da fonte (em inglês)</p>
                      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">
                        {entry.definition}
                      </p>
                    </div>
                  )}
                  <p className="rounded border border-dashed border-border bg-muted/20 p-2 text-xs text-muted-foreground">
                    A tradução lexical revisada em português ainda não foi importada. A interface
                    mantém o idioma original do dicionário para não apresentar tradução automática
                    como conteúdo acadêmico.
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {entry.language === "hbo"
                      ? "TBESH · STEP Bible / Tyndale House Cambridge · gloss importado; definição longa retida pelo gate de direitos"
                      : "TBESG · STEP Bible / Tyndale House Cambridge · CC BY 4.0"}
                  </p>
                </article>
              ))}
            {annotation ? (
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="meta-label">
                    Lema(s) fornecido(s) pelo {isTagnt ? "TAGNT" : "corpus linguístico"}
                  </dt>
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
                {wordBundle?.dictionary.status !== "available" && (
                  <p className="text-xs text-muted-foreground">
                    Não há verbete TBESG resolvido para esta identificação lexical.
                  </p>
                )}
              </dl>
            ) : (
              <div className="space-y-2 text-sm">
                {wordBundle?.lexeme.status === "available" ? (
                  <>
                    <p className="original-text text-lg">
                      {wordBundle.lexeme.data.lemmas.join(", ")}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {wordBundle.lexeme.data.lexicalReferences
                        .map((reference) => reference.value)
                        .join(" · ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Identidade lexical fornecida pelo corpus; nenhuma definição de dicionário foi
                      importada para este lema.
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground italic">
                    {t("scripture.lexiconMissing", { lemma: wordLabel })}
                  </p>
                )}
              </div>
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
                {...(!isTagnt ? { token } : {})}
              />
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
            {annotation && wordBundle && (
              <div className="space-y-2 rounded border border-border p-3 text-xs">
                <p className="font-medium">
                  {isTagnt
                    ? "Texto: SBLGNT · Análise linguística: TAGNT"
                    : "Texto: WLC · Análise linguística: OSHB"}
                </p>
                <details>
                  <summary className="cursor-pointer">Rastreabilidade e valores originais</summary>
                  <dl className="mt-2 space-y-2 break-all">
                    <dt>{isTagnt ? "Token SBLGNT" : "Token WLC/OSHB"}</dt>
                    <dd>{token.id}</dd>
                    <dt>{isTagnt ? "Registro TAGNT" : "Registro OSHB"}</dt>
                    <dd>{annotation.sourceRecordId}</dd>
                    <dt>Artefato-fonte / linha</dt>
                    <dd>
                      {annotation.provenance.sourceArtifactId}:{annotation.provenance.sourceLine}
                    </dd>
                    <dt>Forma original</dt>
                    <dd>{annotation.raw.greek ?? annotation.raw.surface}</dd>
                    {annotation.raw.lexicalGrammar && (
                      <>
                        <dt>Gramática original</dt>
                        <dd>{annotation.raw.lexicalGrammar}</dd>
                      </>
                    )}
                    {annotation.raw.editions && (
                      <>
                        <dt>Edições</dt>
                        <dd>{annotation.raw.editions}</dd>
                      </>
                    )}
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
            {wordBundle?.sources.references.map((source) => {
              const fragment = wordBundle.sources.fragments.find(
                (item) => item.sourceId === source.id,
              );
              return <SourceReferenceCard key={source.id} source={source} fragment={fragment} />;
            })}
            {(!wordBundle || wordBundle.sources.references.length === 0) && (
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
          void addNote(t("scripture.noteOn", { lemma: wordLabel }), "", [
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
          void addToStudy(id, { kind: "word", refId: wordId, label: wordLabel });
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
