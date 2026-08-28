import { AnalysisRepository } from "../repositories/analysis-repository";
import { KnowledgeRepository } from "../repositories/knowledge-repository";
import { LibraryRepository } from "../repositories/library-repository";
import { ScriptureRepository } from "../repositories/scripture-repository";
import { SourceRepository } from "../repositories/source-repository";
import { StudyRepository } from "../repositories/study-repository";
import { LinguisticRepository } from "../repositories/linguistic-repository";
import { available, unavailable } from "../domain/availability";
import type { PassageKnowledgeBundle } from "../domain/knowledge-bundle";
import { anchorKey, type KnowledgeRelation, type TextAnchor } from "../domain/knowledge";
import { passageRefKey, type PassageRef } from "../domain/scripture";

export interface ScriptureKnowledgeEngineDependencies {
  scripture: typeof ScriptureRepository;
  knowledge: typeof KnowledgeRepository;
  library: typeof LibraryRepository;
  sources: typeof SourceRepository;
  analysis: typeof AnalysisRepository;
  study: typeof StudyRepository;
  linguistic: typeof LinguisticRepository;
}

const defaultDependencies: ScriptureKnowledgeEngineDependencies = {
  scripture: ScriptureRepository,
  knowledge: KnowledgeRepository,
  library: LibraryRepository,
  sources: SourceRepository,
  analysis: AnalysisRepository,
  study: StudyRepository,
  linguistic: LinguisticRepository,
};

function anchorsOf(relation: KnowledgeRelation): TextAnchor[] {
  return [relation.from, relation.to];
}

function relationClosure(
  initial: KnowledgeRelation[],
  all: KnowledgeRelation[],
  depth = 2,
): KnowledgeRelation[] {
  const selected = new Map(initial.map((relation) => [relation.id, relation]));
  let frontier = new Set(initial.flatMap(anchorsOf).map(anchorKey));

  for (let level = 0; level < depth; level += 1) {
    const next = new Set<string>();
    for (const relation of all) {
      if (selected.has(relation.id)) continue;
      if (!anchorsOf(relation).some((anchor) => frontier.has(anchorKey(anchor)))) continue;
      selected.set(relation.id, relation);
      anchorsOf(relation).forEach((anchor) => next.add(anchorKey(anchor)));
    }
    frontier = next;
  }

  return [...selected.values()];
}

function passageLabel(ref: PassageRef, bookName: string): string {
  if (!ref.verseStart) return `${bookName} ${ref.chapter}`;
  if (ref.verseEnd && ref.verseEnd !== ref.verseStart) {
    return `${bookName} ${ref.chapter}:${ref.verseStart}–${ref.verseEnd}`;
  }
  return `${bookName} ${ref.chapter}:${ref.verseStart}`;
}

export function createScriptureKnowledgeEngine(
  dependencies: ScriptureKnowledgeEngineDependencies = defaultDependencies,
) {
  return {
    async loadLinguisticPassage(ref: PassageRef) {
      await dependencies.linguistic.loadChapter(ref.bookId, ref.chapter);
      return dependencies.linguistic.getPassage(ref);
    },
    getPassageKnowledgeBundle(ref: PassageRef): PassageKnowledgeBundle | null {
      const book = dependencies.scripture.getBook(ref.bookId);
      if (!book) return null;

      const verses = dependencies.scripture.getPassage(ref);
      if (!verses.length) return null;

      const tokens = verses.flatMap((verse) => verse.original ?? []);
      const linguistics = dependencies.linguistic.getPassage(ref);
      const textUnits = dependencies.scripture.getTextUnits(ref);
      const lemmas = dependencies.scripture.getLemmaEntries(
        tokens.flatMap((token) => (token.lemma ? [token.lemma] : [])),
      );
      const directRelations = dependencies.knowledge.relationsForPassage(ref);
      const relations = relationClosure(directRelations, dependencies.knowledge.allRelations());
      const claims = dependencies.knowledge.claimsForPassage(ref);
      const entityIds = new Set(
        relations
          .flatMap(anchorsOf)
          .filter(
            (anchor): anchor is Extract<TextAnchor, { type: "entity" }> => anchor.type === "entity",
          )
          .map((anchor) => anchor.entityId),
      );
      const entities = [...entityIds]
        .map((id) => dependencies.knowledge.getEntity(id))
        .filter((entity) => entity !== null);

      const fragmentIds = new Set([
        ...relations.flatMap((relation) => relation.sourceFragmentIds),
        ...claims.flatMap((claim) => claim.sourceFragmentIds),
      ]);
      dependencies.sources
        .fragmentsForPassage(ref)
        .forEach((fragment) => fragmentIds.add(fragment.id));
      const fragments = [...fragmentIds]
        .map((id) => dependencies.sources.getFragment(id))
        .filter((fragment) => fragment !== null);
      const sourceIds = new Set(fragments.map((fragment) => fragment.sourceId));
      const references = [...sourceIds]
        .map((id) => dependencies.sources.getReference(id))
        .filter((source) => source !== null);
      const resourceIds = new Set(fragments.map((fragment) => fragment.resourceId));
      const resources = [...resourceIds]
        .map((id) => dependencies.library.getResource(id))
        .filter((resource) => resource !== null);

      const editionIds = new Set<string>();
      verses.forEach((verse) => {
        Object.keys(verse.translations).forEach((id) => editionIds.add(id));
        if (verse.originalEditionId) editionIds.add(verse.originalEditionId);
      });
      const editions = dependencies.scripture
        .listEditions()
        .filter((edition) => editionIds.has(edition.id));
      const analyses = dependencies.analysis.analysesForPassage(ref);
      const crossReferences = relations.filter(
        (relation) =>
          relation.from.type === "passage" &&
          relation.to.type === "passage" &&
          anchorKey(relation.from) !== anchorKey(relation.to),
      );

      return {
        identity: {
          ref,
          label: passageLabel(ref, book.name),
          key: passageRefKey(ref),
        },
        passage: { verses, editions, textUnits },
        originals: tokens.length
          ? available(
              tokens,
              tokens.length ? "Original-language coverage is partial in DEMO data." : undefined,
            )
          : unavailable(
              "not-imported",
              "Original-language tokens are not imported for this passage.",
            ),
        lemmas: lemmas.length
          ? available(lemmas)
          : unavailable("not-indexed", "No lexical entries are indexed for this passage."),
        linguistics: linguistics
          ? available(linguistics)
          : unavailable("not-analyzed", "Camada linguística não carregada para esta passagem."),
        variants: unavailable("not-imported", "A textual apparatus has not been imported."),
        entities: entities.length
          ? available(entities)
          : unavailable("not-indexed", "No knowledge entities are linked to this passage."),
        concepts: entities.some((entity) => entity.type === "concept")
          ? available(entities.filter((entity) => entity.type === "concept"))
          : unavailable("awaiting-source", "No sourced concepts are linked to this passage."),
        relations: relations.length
          ? available(relations)
          : unavailable("not-indexed", "No knowledge relations are indexed for this passage."),
        claims: claims.length
          ? available(claims)
          : unavailable("awaiting-source", "No source-backed claims are available."),
        crossReferences: crossReferences.length
          ? available(crossReferences)
          : unavailable("not-indexed", "No structured cross references are indexed."),
        analyses: analyses.length
          ? available(analyses)
          : unavailable("not-analyzed", "No source-backed analysis is available."),
        lenses: dependencies.analysis.listLenses(),
        perspectives: dependencies.analysis.listPerspectives(),
        sources: { references, fragments, resources },
        user: {
          notes: dependencies.study.notesForPassage(ref),
          studyLinks: dependencies.study.studyItemsForPassage(ref),
        },
        provenance: dependencies.scripture.getPassageProvenance(ref) ?? {
          acquisition: "bundled",
          creationMethod: "human",
          isDemo: true,
          note: "Fixture-backed Knowledge Core v1 bundle.",
        },
      };
    },
  };
}

export const ScriptureKnowledgeEngine = createScriptureKnowledgeEngine();

export function validatePassageKnowledgeBundle(bundle: PassageKnowledgeBundle): string[] {
  const errors: string[] = [];
  const resourceIds = new Set(bundle.sources.resources.map((resource) => resource.id));
  const fragmentIds = new Set(bundle.sources.fragments.map((fragment) => fragment.id));
  const textUnitIds = new Set(bundle.passage.textUnits.map((unit) => unit.id));
  const editionIds = new Set(bundle.passage.editions.map((edition) => edition.id));

  for (const fragment of bundle.sources.fragments) {
    if (!resourceIds.has(fragment.resourceId)) {
      errors.push(`Fragment ${fragment.id} references missing resource ${fragment.resourceId}.`);
    }
  }
  if (bundle.claims.status === "available") {
    for (const claim of bundle.claims.data) {
      if (!claim.anchors.length) errors.push(`Claim ${claim.id} has no anchors.`);
      for (const fragmentId of claim.sourceFragmentIds) {
        if (!fragmentIds.has(fragmentId)) {
          errors.push(`Claim ${claim.id} references missing fragment ${fragmentId}.`);
        }
      }
    }
  }
  if (bundle.relations.status === "available") {
    for (const relation of bundle.relations.data) {
      if (!relation.relation.value.trim()) errors.push(`Relation ${relation.id} has no type.`);
      for (const fragmentId of relation.sourceFragmentIds) {
        if (!fragmentIds.has(fragmentId)) {
          errors.push(`Relation ${relation.id} references missing fragment ${fragmentId}.`);
        }
      }
    }
  }
  if (bundle.originals.status === "available") {
    for (const token of bundle.originals.data) {
      if (
        !editionIds.has(token.editionId) ||
        !textUnitIds.has(token.textUnitId) ||
        token.position < 1
      ) {
        errors.push(`Token ${token.id} is not traceable to edition/text unit/position.`);
      }
      if ((token.lemma && !token.lemmaId) || (!token.lemma && token.lemmaId)) {
        errors.push(`Token ${token.id} has incomplete optional lemma identity.`);
      }
    }
  }
  return errors;
}
