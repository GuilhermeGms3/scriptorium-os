import { useId, useRef, useState } from "react";
import { BookOpen } from "lucide-react";
import type { PassageKnowledgeBundle } from "../../lib/domain/knowledge-bundle";
import type { VerseExplorationBlock } from "../../lib/domain/verse-exploration";
import { passageRefKey, type PassageRef } from "../../lib/domain/scripture";
import {
  passageLabel,
  reviewStatusLabel,
  claimKindLabel,
  studyLensPresentation,
} from "../../lib/i18n";
import { passageReadingSource } from "../../lib/application/reading-source";
import { commentaryProvenance } from "./commentary-presentation";
import { useSourceReader } from "../study/source-reader-context";
import { useWorkbench } from "../../lib/workbench/workbench-context";
import { useStudyDraftGuard } from "../../hooks/use-study-draft-guard";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { NoteMarkdown } from "../notes/note-markdown";
import { Link } from "@tanstack/react-router";
import { errorMessage } from "../../lib/utils";
import { EXPLORATION_AREA_LABELS as AREA_LABELS } from "../../lib/domain/verse-exploration";
import { hasAvailableData } from "../../lib/domain/availability";

function Paragraphs({ text }: { text: string }) {
  return (
    <div className="space-y-4">
      {text
        .split(/\n\s*\n/u)
        .filter(Boolean)
        .map((part, index) => (
          <p key={index} className="whitespace-pre-line leading-[1.85]">
            {part}
          </p>
        ))}
    </div>
  );
}

export function VerseExplorationDetail({
  block,
  verse,
  bundle,
  onClose,
}: {
  block: VerseExplorationBlock;
  verse: number;
  bundle: PassageKnowledgeBundle;
  onClose: () => void;
}) {
  const { addNote, notes, selectWord } = useWorkbench();
  const openSource = useSourceReader();
  const [body, setBody] = useState("");
  const [title, setTitle] = useState(block.title.slice(0, 160));
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const origin = useRef(
    typeof document !== "undefined" && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<string>();
  const noteTitleId = useId();
  const noteBodyId = useId();
  const [libraryIndex, setLibraryIndex] = useState(0);
  const libraryItem =
    block.kind === "library" ? (block.items[libraryIndex] ?? block.item) : undefined;
  const dirty = Boolean(body.trim());
  useStudyDraftGuard(dirty);
  const ref: PassageRef = { ...bundle.identity.ref, verseStart: verse, verseEnd: verse };
  const label = passageLabel(ref);
  function leave(action: () => void) {
    if (lock.current || (dirty && !window.confirm("Descartar a nota ainda não salva?"))) return;
    onClose();
    // The source reader captures its opener. Restore the persistent block first,
    // instead of giving it a button in this dialog that has just been unmounted.
    window.requestAnimationFrame(() => {
      origin.current?.focus();
      action();
    });
  }
  const fragmentIds =
    block.kind === "claim"
      ? block.claim.sourceFragmentIds
      : block.kind === "analysis"
        ? block.analysis.sourceFragmentIds
        : [];
  const fragments = bundle.sources.fragments.filter((fragment) =>
    fragmentIds.includes(fragment.id),
  );
  const sourceIds = new Set(fragments.map((fragment) => fragment.sourceId));
  const counterpoints =
    block.kind === "claim" && hasAvailableData(bundle.viewpoints)
      ? bundle.viewpoints.data
          .filter((viewpoint) => viewpoint.claims.some((claim) => claim.id === block.claim.id))
          .flatMap((viewpoint) => viewpoint.opposingArguments)
      : [];
  async function save() {
    if (lock.current || !body.trim() || !title.trim()) return;
    lock.current = true;
    setSaving(true);
    setError("");
    try {
      const note = await addNote(title.trim(), body.trim(), [
        { kind: "passage", target: passageRefKey(ref), label, anchor: { type: "passage", ref } },
        ...(block.kind === "library"
          ? [
              {
                kind: "resource" as const,
                target: block.item.document.sourceId,
                label: block.item.document.title,
              },
            ]
          : []),
        ...bundle.sources.references
          .filter((source) => sourceIds.has(source.id))
          .map((source) => ({ kind: "resource" as const, target: source.id, label: source.work })),
      ]);
      setSaved(note.id);
      setBody("");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) leave(() => {});
      }}
    >
      <DialogContent
        className="exploration-detail flex max-h-[90svh] w-[calc(100%-2rem)] max-w-3xl flex-col overflow-hidden p-0"
        onEscapeKeyDown={(event) => {
          if (saving) event.preventDefault();
        }}
      >
        <DialogHeader className="border-b border-border p-6 pr-12 text-left">
          <p className="exploration-category mb-2" data-area={block.area}>
            {AREA_LABELS[block.area]} · {label}
          </p>
          <DialogTitle className="font-serif text-2xl leading-snug">{block.title}</DialogTitle>
          <DialogDescription>{block.category} · conteúdo vinculado à passagem</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto px-6 pb-6 pt-4 sm:px-8">
          {block.kind === "library" && libraryItem && (
            <>
              {block.items.length > 1 && (
                <label className="mb-5 block text-sm font-medium">
                  Trechos desta fonte · {block.items.length}
                  <select
                    className="mt-2 block w-full rounded border border-input bg-background p-2 font-sans text-sm"
                    value={libraryIndex}
                    onChange={(event) => setLibraryIndex(Number(event.target.value))}
                  >
                    {block.items.map((item, index) => (
                      <option key={item.id} value={index}>
                        {index + 1}.{" "}
                        {item.passageRelation.payload.contextualAnalysis?.title ??
                          item.context.sectionTitle ??
                          "Trecho relacionado"}{" "}
                        · p. {item.pages.map((page) => page + 1).join(", ")}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="mb-5 border-l-2 border-primary/50 pl-4 text-sm">
                <p className="font-semibold">{libraryItem.document.title}</p>
                <p className="mt-1 text-muted-foreground">
                  {libraryItem.context.authors.join(" · ")}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {libraryItem.passageRelation.payload.contextualAnalysis?.sourceContext?.locator ??
                    `Páginas ${libraryItem.pages.map((page) => page + 1).join(", ")}`}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {commentaryProvenance(libraryItem)}
                </p>
                <Button
                  className="mt-3"
                  variant="outline"
                  size="sm"
                  onClick={() => leave(() => openSource(passageReadingSource(libraryItem)))}
                >
                  <BookOpen className="mr-2 size-4" />
                  Ler fonte e anotar
                </Button>
              </div>
              <section aria-label="Conteúdo aprofundado" className="font-sans text-base">
                <Paragraphs
                  text={
                    libraryItem.passageRelation.payload.contextualAnalysis?.summary ??
                    libraryItem.translation?.translatedText ??
                    libraryItem.unit.text
                  }
                />
              </section>
              {libraryItem.translation &&
                !libraryItem.passageRelation.payload.contextualAnalysis && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Tradução automática. Consulte o original na fonte.
                  </p>
                )}
              <h3 className="mb-2 mt-6 font-serif text-lg font-semibold">Relação com a passagem</h3>
              <p className="text-sm leading-relaxed">
                {libraryItem.passageRelation.payload.contextualAnalysis?.mode === "source-excerpt"
                  ? `Texto da fonte associado a ${libraryItem.passageRelation.payload.rawReference}. ${libraryItem.passageRelation.payload.referenceRole === "proof-text" ? "A obra utiliza a passagem na própria argumentação confessional." : "A explicação pertence ao autor e à perspectiva desta obra."}`
                  : (libraryItem.passageRelation.payload.contextualAnalysis?.rationale ??
                    "Trecho ligado à referência pelo acervo; a associação não equivale a uma explicação exegética.")}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Referência da fonte: {libraryItem.passageRelation.payload.rawReference}. Pode
                abranger outros versículos; a posição na linha não torna o trecho exclusivo deste
                versículo.
              </p>
              {libraryItem.passageRelation.payload.contextualAnalysis?.historicalContext && (
                <section className="mt-5 border-l-2 border-border pl-4">
                  <h3 className="font-semibold">Contexto histórico indicado pela fonte</h3>
                  <p className="mt-2 text-sm">
                    {libraryItem.passageRelation.payload.contextualAnalysis.historicalContext.place}{" "}
                    ·{" "}
                    {
                      libraryItem.passageRelation.payload.contextualAnalysis.historicalContext
                        .period
                    }
                  </p>
                  <p className="mt-2 text-sm leading-relaxed">
                    {
                      libraryItem.passageRelation.payload.contextualAnalysis.historicalContext
                        .qualification
                    }
                  </p>
                </section>
              )}
              {Boolean(
                libraryItem.passageRelation.payload.contextualAnalysis?.limitations.length,
              ) && (
                <section className="mt-6">
                  <h3 className="mb-2 font-serif text-lg font-semibold">Limites desta leitura</h3>
                  <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
                    {libraryItem.passageRelation.payload.contextualAnalysis!.limitations.map(
                      (limit) => (
                        <li key={limit}>{limit}</li>
                      ),
                    )}
                  </ul>
                </section>
              )}
            </>
          )}
          {(block.kind === "analysis" || block.kind === "claim") && (
            <>
              <p className="mb-4 text-xs text-muted-foreground">
                {reviewStatusLabel(
                  block.kind === "analysis"
                    ? block.analysis.reviewStatus
                    : block.claim.reviewStatus,
                )}{" "}
                ·{" "}
                {block.kind === "claim"
                  ? claimKindLabel(block.claim.kind)
                  : studyLensPresentation(
                      bundle.lenses.find((lens) => lens.id === block.analysis.lensId) ?? {
                        id: block.analysis.lensId,
                        label: block.analysis.lensId,
                        shortLabel: "",
                        description: "",
                        guidingQuestions: [],
                        evidenceKinds: [],
                      },
                    ).label}
              </p>
              <Paragraphs
                text={
                  block.kind === "analysis"
                    ? (block.analysis.summary ?? "")
                    : block.claim.proposition
                }
              />
              <p className="mt-5 border-l-2 border-border pl-4 text-sm leading-relaxed">
                {block.kind === "analysis"
                  ? (block.analysis.authorNote ??
                    "Análise vinculada ao intervalo da passagem; não necessariamente exclusiva deste versículo.")
                  : (block.claim.assessmentNote ??
                    "A presença desta afirmação no acervo não significa consenso entre tradições.")}
              </p>
              <section className="mt-6">
                <h3 className="mb-3 font-serif text-lg font-semibold">Fontes e localizadores</h3>
                {fragments.length ? (
                  fragments.map((fragment) => {
                    const source = bundle.sources.references.find(
                      (entry) => entry.id === fragment.sourceId,
                    );
                    return (
                      <div key={fragment.id} className="mb-3 border-l-2 border-border pl-3 text-sm">
                        <p>
                          {source?.author}
                          {source?.author ? " · " : ""}
                          {source?.work ?? "Fonte não identificada"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{fragment.locator}</p>
                        {fragment.fragment && (
                          <blockquote className="mt-2 whitespace-pre-line leading-relaxed">
                            {fragment.fragment}
                          </blockquote>
                        )}
                        {source && (
                          <button
                            type="button"
                            className="mt-2 text-primary underline underline-offset-4"
                            onClick={() =>
                              leave(() =>
                                openSource({
                                  source: {
                                    kind: "bibliographic",
                                    sourceId: source.id,
                                    title: source.work,
                                    locator: fragment.locator,
                                  },
                                  ...(fragment.fragment ? { excerpt: fragment.fragment } : {}),
                                  ...(source.url ? { externalUrl: source.url } : {}),
                                  links: [
                                    {
                                      kind: "passage",
                                      target: passageRefKey(ref),
                                      label,
                                      anchor: { type: "passage", ref },
                                    },
                                  ],
                                }),
                              )
                            }
                          >
                            Consultar fonte e anotar
                          </button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Este registro ainda não tem fonte localizada no acervo.
                  </p>
                )}
              </section>
              {counterpoints.length > 0 && (
                <section className="mt-6">
                  <h3 className="mb-3 font-serif text-lg font-semibold">
                    Contrapontos registrados
                  </h3>
                  {[
                    ...new Map(counterpoints.map((argument) => [argument.id, argument])).values(),
                  ].map((argument) => (
                    <article className="mb-3 border-l-2 border-border pl-3" key={argument.id}>
                      <h4 className="text-sm font-semibold">
                        {argument.title ?? "Argumento em contraponto"}
                      </h4>
                      {argument.notes && (
                        <p className="mt-2 text-sm leading-relaxed">{argument.notes}</p>
                      )}
                    </article>
                  ))}
                </section>
              )}
            </>
          )}
          {block.kind === "language" && (
            <>
              <p className="mb-5 text-sm text-muted-foreground">
                Palavras da edição original instalada. Abra uma palavra para consultar o léxico e a
                morfologia disponíveis no painel.
              </p>
              <ol className="divide-y divide-border">
                {block.tokens.map((token) => (
                  <li key={token.id} className="flex items-baseline justify-between gap-4 py-3">
                    <div>
                      <button
                        type="button"
                        className="original-text text-xl hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => leave(() => selectWord({ token, verseLabel: label }))}
                      >
                        {token.surface}
                      </button>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {token.lemma ?? token.transliteration ?? ""}
                      </p>
                    </div>
                    <span className="max-w-[55%] text-sm">{token.gloss ?? ""}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-5 text-xs text-muted-foreground">
                {[...new Set(block.tokens.map((token) => token.editionId))]
                  .map(
                    (id) =>
                      bundle.passage.editions.find((edition) => edition.id === id)?.title ?? id,
                  )
                  .join(" · ")}
                . Glosas e dados lexicais só aparecem quando importados; não definem sozinhos o
                sentido no contexto.
              </p>
            </>
          )}
          {block.kind === "note" && (
            <>
              <p className="mb-4 text-xs text-muted-foreground">
                Nota pessoal · {new Date(block.note.updatedAt).toLocaleDateString("pt-BR")}
              </p>
              <NoteMarkdown body={block.note.body} notes={notes} />
              <Button className="mt-4" variant="outline" asChild>
                <Link to="/notes" search={{ note: block.note.id }}>
                  Abrir no caderno
                </Link>
              </Button>
            </>
          )}
          <details className="mt-8 border-t border-border pt-4">
            <summary className="cursor-pointer text-sm font-medium">
              Registrar uma nota sobre {label}
            </summary>
            <div className="mt-4 space-y-3">
              <div className="text-sm">
                <label htmlFor={noteTitleId}>Título</label>
                <Input
                  id={noteTitleId}
                  value={title}
                  disabled={saving}
                  maxLength={500}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </div>
              <div className="text-sm">
                <label htmlFor={noteBodyId}>Minha investigação</label>
                <Textarea
                  id={noteBodyId}
                  value={body}
                  disabled={saving}
                  className="mt-1 min-h-32"
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Pergunta, observação ou conexão…"
                />
              </div>
              <Button
                disabled={saving || !body.trim() || !title.trim()}
                onClick={() => void save()}
              >
                {saving ? "Salvando…" : "Salvar nota vinculada"}
              </Button>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              {saved && (
                <p role="status" className="text-sm">
                  Nota salva e vinculada a {label}.{" "}
                  <Link to="/notes" search={{ note: saved }} className="underline">
                    Abrir no caderno
                  </Link>
                </p>
              )}
            </div>
          </details>
        </div>
      </DialogContent>
    </Dialog>
  );
}
