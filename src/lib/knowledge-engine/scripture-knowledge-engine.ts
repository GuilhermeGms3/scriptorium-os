import { AnalysisRepository } from "../repositories/analysis-repository";
import { KnowledgeRepository } from "../repositories/knowledge-repository";
import { ScriptureRepository } from "../repositories/scripture-repository";
import { StudyRepository } from "../repositories/study-repository";
import { LinguisticRepository } from "../repositories/linguistic-repository";
import { corpusRegistry, type CorpusRegistry } from "../repositories/corpus-registry";
import { available, demo, hasAvailableData, unavailable } from "../domain/availability";
import type {
  PassageKnowledgeBundle,
  PassageViewpoint,
  ScriptureTextLayer,
  WordKnowledgeBundle,
} from "../domain/knowledge-bundle";
import { anchorKey, type KnowledgeRelation, type TextAnchor } from "../domain/knowledge";
import {
  passageRefKey,
  type Book,
  type PassageRef,
  type TokenOccurrence,
} from "../domain/scripture";
import type { Provenance, SourceFragment, SourceReference } from "../domain/source";
import type { LinguisticAnnotation, TokenAlignment } from "../domain/linguistic";

export interface ScriptureKnowledgeEngineDependencies {
  scripture: typeof ScriptureRepository;
  knowledge: typeof KnowledgeRepository;
  analysis: typeof AnalysisRepository;
  study: typeof StudyRepository;
  linguistic: typeof LinguisticRepository;
  corpus: CorpusRegistry;
}

const defaultDependencies: ScriptureKnowledgeEngineDependencies = {
  scripture: ScriptureRepository,
  knowledge: KnowledgeRepository,
  analysis: AnalysisRepository,
  study: StudyRepository,
  linguistic: LinguisticRepository,
  corpus: corpusRegistry,
};

export type PassageKnowledgeQuery =
  | PassageRef
  | {
      book: string;
      chapter: number;
      verseStart?: number;
      verseEnd?: number;
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

function resolvePassageRef(query: PassageKnowledgeQuery, books: Book[]): PassageRef | null {
  if ("bookId" in query) return query;
  const requested = query.book.trim().toLocaleLowerCase("en");
  const book = books.find(
    (candidate) =>
      candidate.id.toLocaleLowerCase("en") === requested ||
      candidate.name.toLocaleLowerCase("en") === requested ||
      candidate.abbreviation.toLocaleLowerCase("en") === requested,
  );
  if (!book) return null;
  return {
    bookId: book.id,
    chapter: query.chapter,
    ...(query.verseStart !== undefined ? { verseStart: query.verseStart } : {}),
    ...(query.verseEnd !== undefined ? { verseEnd: query.verseEnd } : {}),
  };
}

function corpusSource(
  provenance: Provenance,
  ref: PassageRef,
  label: string,
  registry: CorpusRegistry,
): { reference: SourceReference; fragment: SourceFragment } | null {
  if (!provenance.packageId) return null;
  const manifest = registry.getPackage(provenance.packageId);
  if (!manifest) return null;
  const sourceId = `source:corpus:${manifest.id}`;
  const artifactId = provenance.sourceArtifactIds?.[0];
  const artifact = artifactId ? registry.getArtifact(artifactId) : null;
  return {
    reference: {
      id: sourceId,
      work: manifest.title,
      ...((manifest.version ?? manifest.revision)
        ? { edition: manifest.version ?? manifest.revision }
        : {}),
      url: manifest.canonicalSource,
      sourceType: "edition",
      language: manifest.language,
      license: manifest.rights.license,
      provenance,
    },
    fragment: {
      id: `fragment:corpus:${manifest.editionId}:${passageRefKey(ref)}`,
      sourceId,
      locator: `${label}${artifact ? ` · ${artifact.sourcePath}` : ""}`,
      passage: ref,
      sourceType: "primary-text",
      epistemicRole: "primary",
      ...(artifactId ? { artifactId } : {}),
      provenance,
    },
  };
}

export function createScriptureKnowledgeEngine(
  dependencies: ScriptureKnowledgeEngineDependencies = defaultDependencies,
) {
  const knowledgeCache = new Map<
    string,
    {
      relations: KnowledgeRelation[];
      claims: Awaited<ReturnType<typeof KnowledgeRepository.claimsForPassage>>;
      entities: NonNullable<Awaited<ReturnType<typeof KnowledgeRepository.getEntity>>>[];
      references: SourceReference[];
      fragments: SourceFragment[];
      analyses: Awaited<ReturnType<typeof KnowledgeRepository.analysesForPassage>>;
      viewpoints: PassageViewpoint[];
    }
  >();
  const engine = {
    listBooks: () => dependencies.scripture.listBooks(),
    listEditions: () => dependencies.scripture.listEditions(),
    getBook: (bookId: string) => dependencies.scripture.getBook(bookId),
    availableChapters: (bookId: string) => dependencies.scripture.availableChapters(bookId),
    defaultEditionId: (bookId: string, chapter: number) =>
      dependencies.scripture.defaultEditionId(bookId, chapter),
    resolvePassageRef(query: PassageKnowledgeQuery) {
      return resolvePassageRef(query, dependencies.scripture.listBooks());
    },
    async loadLinguisticPassage(ref: PassageRef) {
      await dependencies.linguistic.loadChapter(ref.bookId, ref.chapter);
      return dependencies.linguistic.getPassage(ref);
    },
    async loadPassageKnowledgeBundle(
      query: PassageKnowledgeQuery,
    ): Promise<PassageKnowledgeBundle | null> {
      const ref = resolvePassageRef(query, dependencies.scripture.listBooks());
      if (!ref) return null;
      const [, , directRelations, allRelations, claims, analyses, viewpoints] = await Promise.all([
        dependencies.scripture.loadChapter(ref.bookId, ref.chapter),
        dependencies.linguistic.loadChapter(ref.bookId, ref.chapter),
        dependencies.knowledge.relationsForPassage(ref),
        dependencies.knowledge.allRelations(),
        dependencies.knowledge.claimsForPassage(ref),
        dependencies.knowledge.analysesForPassage(ref),
        dependencies.knowledge.viewpointsForPassage(ref),
      ]);
      const relations = relationClosure(directRelations, allRelations);
      const entityIds = new Set(
        relations
          .flatMap(anchorsOf)
          .filter(
            (anchor): anchor is Extract<TextAnchor, { type: "entity" }> => anchor.type === "entity",
          )
          .map((anchor) => anchor.entityId),
      );
      const entities = (
        await Promise.all([...entityIds].map((id) => dependencies.knowledge.getEntity(id)))
      ).filter((entity): entity is NonNullable<typeof entity> => entity !== null);
      const [claimSources, relationSources, analysisSources] = await Promise.all([
        dependencies.knowledge.sourcesForClaims(claims.map((claim) => claim.id)),
        dependencies.knowledge.sourcesForRelations(relations.map((relation) => relation.id)),
        dependencies.knowledge.sourcesForAnalyses(analyses.map((analysis) => analysis.id)),
      ]);
      knowledgeCache.set(passageRefKey(ref), {
        relations,
        claims,
        entities,
        references: [
          ...new Map(
            [
              ...claimSources.references,
              ...relationSources.references,
              ...analysisSources.references,
            ].map((source) => [source.id, source]),
          ).values(),
        ],
        fragments: [
          ...new Map(
            [
              ...claimSources.fragments,
              ...relationSources.fragments,
              ...analysisSources.fragments,
            ].map((fragment) => [fragment.id, fragment]),
          ).values(),
        ],
        analyses,
        viewpoints,
      });
      return engine.getPassageKnowledgeBundle(ref);
    },
    primePassageKnowledgeBundle(bundle: PassageKnowledgeBundle | null): void {
      if (!bundle) return;
      const primary = bundle.texts[0];
      const chapter = {
        bookId: bundle.identity.ref.bookId,
        chapter: bundle.identity.ref.chapter,
        verses: bundle.passage.verses,
        ...(primary?.provenance.packageId && primary.provenance.datasetId
          ? {
              schemaVersion: 1 as const,
              corpusId: primary.edition.corpusId,
              editionId: primary.editionId,
              packageId: primary.provenance.packageId,
              datasetId: primary.provenance.datasetId,
              sourceArtifactId: primary.provenance.sourceArtifactIds?.[0] ?? "",
              sourcePath: primary.provenance.sourceArtifactIds?.[0] ?? "serialized-loader",
            }
          : {}),
      };
      dependencies.scripture.primeChapter(chapter);
    },
    getPassageKnowledgeBundle(query: PassageKnowledgeQuery): PassageKnowledgeBundle | null {
      const ref = resolvePassageRef(query, dependencies.scripture.listBooks());
      if (!ref) return null;
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
      const cachedKnowledge = knowledgeCache.get(passageRefKey(ref));
      const relations = cachedKnowledge?.relations ?? [];
      const claims = cachedKnowledge?.claims ?? [];
      const entities = cachedKnowledge?.entities ?? [];
      const viewpoints = cachedKnowledge?.viewpoints ?? [];
      const viewpointProfiles = viewpoints.flatMap((viewpoint) =>
        viewpoint.profile ? [viewpoint.profile] : [],
      );
      const hasViewpoints = viewpoints.some(
        (viewpoint) =>
          viewpoint.profile !== null ||
          viewpoint.supportingArguments.length > 0 ||
          viewpoint.opposingArguments.length > 0,
      );
      const perspectives = viewpointProfiles.length
        ? viewpointProfiles
        : dependencies.analysis.listPerspectives();

      const editionIds = new Set<string>();
      verses.forEach((verse) => {
        Object.keys(verse.translations).forEach((id) => editionIds.add(id));
        if (verse.originalEditionId) editionIds.add(verse.originalEditionId);
      });
      const editions = dependencies.scripture
        .listEditions()
        .filter((edition) => editionIds.has(edition.id));
      const provenances = dependencies.scripture.getPassageProvenances(ref);
      const corpusSources: ReturnType<typeof corpusSource>[] = [];
      const texts: ScriptureTextLayer[] = editions.flatMap((edition) => {
        const provenance = provenances[edition.id];
        if (!provenance) return [];
        const units = textUnits.filter((unit) => unit.editionId === edition.id);
        if (!units.length) return [];
        const source = corpusSource(
          provenance,
          ref,
          passageLabel(ref, book.name),
          dependencies.corpus,
        );
        corpusSources.push(source);
        return [
          {
            edition,
            editionId: edition.id,
            language: edition.language,
            text: units.map((unit) => unit.text).join(" "),
            sourceId: source?.reference.id ?? `source:edition:${edition.id}`,
            textUnits: units,
            availability: provenance.isDemo
              ? demo(units, "Camada textual demonstrativa.")
              : available(units),
            provenance,
          },
        ];
      });
      const realSources = corpusSources.filter(
        (source): source is NonNullable<typeof source> => source !== null,
      );
      const references = [
        ...new Map(
          [
            ...realSources.map((source) => source.reference),
            ...(cachedKnowledge?.references ?? []),
          ].map((source) => [source.id, source]),
        ).values(),
      ];
      const fragments = [
        ...new Map(
          [
            ...realSources.map((source) => source.fragment),
            ...(cachedKnowledge?.fragments ?? []),
          ].map((fragment) => [fragment.id, fragment]),
        ).values(),
      ];
      const analyses = cachedKnowledge?.analyses ?? dependencies.analysis.analysesForPassage(ref);
      const crossReferences = relations.filter(
        (relation) =>
          relation.from.type === "passage" &&
          relation.to.type === "passage" &&
          anchorKey(relation.from) !== anchorKey(relation.to),
      );

      const words = tokens.length
        ? available(tokens)
        : unavailable<typeof tokens>("unavailable", "Não há ocorrências de palavras importadas.");
      const annotations = linguistics?.annotations ?? [];
      const linguisticAnnotations = annotations.length
        ? available(annotations)
        : linguistics?.alignments.some((alignment) => alignment.status === "ambiguous")
          ? unavailable<typeof annotations>(
              "ambiguous",
              "Há alinhamentos ambíguos sem anotação atribuída.",
            )
          : unavailable<typeof annotations>(
              "unavailable",
              "Não há anotações linguísticas disponíveis.",
            );
      const lexemeIds = [
        ...new Set(
          annotations.flatMap((annotation) =>
            annotation.normalized.lexemeId ? [annotation.normalized.lexemeId] : [],
          ),
        ),
      ];
      const user = {
        notes: dependencies.study.notesForPassage(ref),
        studyLinks: dependencies.study.studyItemsForPassage(ref),
      };
      const legacyDemoReason =
        "Fixture legado explicitamente demonstrativo; não é conteúdo acadêmico curado.";
      const result: PassageKnowledgeBundle = {
        identity: {
          ref,
          label: passageLabel(ref, book.name),
          key: passageRefKey(ref),
        },
        passage: { verses, editions, textUnits },
        texts,
        words,
        linguisticAnnotations,
        concordance: lexemeIds.length
          ? available({ lexemeIds, lookup: "lazy-by-lexeme" })
          : unavailable(
              "unavailable",
              "Nenhuma identidade lexical permite consultar concordância.",
            ),
        originals: tokens.length
          ? available(tokens)
          : unavailable(
              "not-imported",
              "Original-language tokens are not imported for this passage.",
            ),
        lemmas: lemmas.length
          ? demo(lemmas, legacyDemoReason)
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
        viewpoints: hasViewpoints
          ? available(viewpoints)
          : unavailable(
              "awaiting-source",
              "Nenhuma fonte citada atribui estas afirmações a uma perspectiva.",
            ),
        evidence: fragments.length
          ? available(fragments)
          : unavailable("unavailable", "Nenhum fragmento de fonte foi resolvido."),
        lenses: dependencies.analysis.listLenses(),
        perspectives,
        sources: { references, fragments },
        user,
        availability: {
          passage: "available",
          texts: texts.length ? "available" : "unavailable",
          original: tokens.length ? "available" : "unavailable",
          words: words.status,
          linguisticAnnotations: linguisticAnnotations.status,
          concordance: lexemeIds.length ? "available" : "unavailable",
          entities: entities.length ? "available" : "unavailable",
          relations: relations.length ? "available" : "unavailable",
          claims: claims.length ? "available" : "unavailable",
          evidence: fragments.length ? "available" : "unavailable",
          sources: references.length ? "available" : "unavailable",
          perspectives: perspectives.length ? "available" : "unavailable",
          viewpoints: hasViewpoints ? "available" : "unavailable",
          study: user.notes.length || user.studyLinks.length ? "available" : "empty",
        },
        provenance: dependencies.scripture.getPassageProvenance(ref) ?? {
          acquisition: "bundled",
          creationMethod: "human",
          isDemo: true,
          note: "Fixture-backed Knowledge Core v1 bundle.",
        },
      };
      return result;
    },
    async getWordKnowledgeBundle(
      token: TokenOccurrence,
      offset = 0,
      limit = 30,
    ): Promise<WordKnowledgeBundle> {
      await dependencies.linguistic.loadChapter(token.ref.bookId, token.ref.chapter);
      const passage = dependencies.linguistic.getPassage(token.ref);
      const alignmentValue = passage?.alignments.find((item) => item.targetTokenId === token.id);
      const annotationValue = passage?.annotations.find((item) => item.targetTokenId === token.id);
      const alignment = alignmentValue
        ? alignmentValue.status === "ambiguous"
          ? unavailable<TokenAlignment>("ambiguous", alignmentValue.evidence)
          : alignmentValue.status === "unmatched"
            ? unavailable<TokenAlignment>("unavailable", alignmentValue.evidence)
            : available(alignmentValue)
        : unavailable<TokenAlignment>("unavailable", "Alinhamento linguístico inexistente.");
      const annotation = annotationValue
        ? available(annotationValue)
        : unavailable<LinguisticAnnotation>(
            alignmentValue?.status === "ambiguous" ? "ambiguous" : "unavailable",
            alignmentValue?.evidence ?? "Anotação linguística inexistente.",
          );
      const dataset = dependencies.linguistic.getDataset();
      const isTagntAnnotation = annotationValue?.sourceDatasetId === dataset.id;
      const lexemeValue =
        isTagntAnnotation && annotationValue?.normalized.lexemeId
          ? await dependencies.linguistic.getLexeme(annotationValue.normalized.lexemeId)
          : await dependencies.linguistic.getTokenLexeme(token);
      const concordanceValue = lexemeValue
        ? isTagntAnnotation
          ? await dependencies.linguistic.getOccurrencesByLexeme(lexemeValue.id, offset, limit)
          : await dependencies.linguistic.getTokenOccurrences(token, offset, limit)
        : null;
      const dictionaryValue = annotationValue
        ? await dependencies.linguistic.getDictionaryEntries(
            annotationValue.normalized.lexicalReferences,
            isTagntAnnotation ? undefined : token.editionId,
          )
        : [];
      const artifactId = annotationValue?.provenance.sourceArtifactId;
      const artifact = artifactId ? dependencies.corpus.getArtifact(artifactId) : null;
      const packageId = isTagntAnnotation
        ? dataset.packageId
        : token.editionId === "wlc-oshb-2.2"
          ? "pkg-wlc-oshb-2.2"
          : dataset.packageId;
      const manifest = dependencies.corpus.getPackage(packageId);
      const sourceId = `source:corpus:${packageId}`;
      const provenance: Provenance = {
        acquisition: "bundled",
        creationMethod: "machine-assisted",
        packageId,
        sourceArtifactIds: artifactId ? [artifactId] : [],
        transformationIds: annotationValue?.provenance.transformationIds ?? [],
        datasetId: isTagntAnnotation ? dataset.id : token.editionId,
        attribution:
          manifest?.rights.attribution?.requiredText ??
          manifest?.rights.attribution?.recommendedCitation ??
          dataset.attribution,
      };
      const references: SourceReference[] = manifest
        ? [
            {
              id: sourceId,
              work: manifest.title,
              ...((manifest.version ?? manifest.revision)
                ? { edition: manifest.version ?? manifest.revision }
                : {}),
              url: manifest.canonicalSource,
              sourceType: "dataset",
              language: manifest.language,
              license: manifest.rights.license,
              provenance,
            },
          ]
        : [];
      const fragments: SourceFragment[] = artifactId
        ? [
            {
              id: `fragment:linguistic:${token.id}`,
              sourceId,
              locator: `${artifact?.sourcePath ?? artifactId}${annotationValue ? `:${annotationValue.provenance.sourceLine}` : ""}`,
              passage: token.ref,
              sourceType: "primary-text",
              epistemicRole: "primary",
              artifactId,
              provenance,
            },
          ]
        : [];
      const wordId = lexemeValue?.id ?? token.lemmaId ?? token.id;
      return {
        token,
        alignment,
        annotation,
        lexeme: lexemeValue
          ? available(lexemeValue)
          : unavailable("unavailable", "Identidade lexical não resolvida."),
        dictionary: dictionaryValue.length
          ? available(dictionaryValue)
          : unavailable("unavailable", "Nenhuma definição lexical foi resolvida para este token."),
        morphology: annotationValue?.normalized.morphology.length
          ? available(annotationValue.normalized.morphology)
          : unavailable("unavailable", "Morfologia não atribuída."),
        concordance: concordanceValue
          ? available(concordanceValue)
          : unavailable("unavailable", "Concordância indisponível sem identidade lexical."),
        sources: { references, fragments },
        user: {
          notes: dependencies.study
            .listNotes()
            .filter((note) =>
              note.links.some((link) => link.target === wordId || link.label === token.surface),
            ),
          studyLinks: dependencies.study
            .listStudies()
            .flatMap((study) =>
              study.items.filter((item) => item.kind === "word" && item.refId === wordId),
            ),
        },
        provenance: [provenance],
      };
    },
    getLexicalOccurrences: (lexemeId: string, offset = 0, limit = 30) =>
      dependencies.linguistic.getOccurrencesByLexeme(lexemeId, offset, limit),
  };
  return engine;
}

export const ScriptureKnowledgeEngine = createScriptureKnowledgeEngine();

export function validatePassageKnowledgeBundle(bundle: PassageKnowledgeBundle): string[] {
  const errors: string[] = [];
  const sourceIds = new Set(bundle.sources.references.map((source) => source.id));
  const fragmentIds = new Set(bundle.sources.fragments.map((fragment) => fragment.id));
  const textUnitIds = new Set(bundle.passage.textUnits.map((unit) => unit.id));
  const editionIds = new Set(bundle.passage.editions.map((edition) => edition.id));
  for (const layer of bundle.texts) {
    if (!editionIds.has(layer.edition.id))
      errors.push(`Text layer ${layer.edition.id} has no passage edition.`);
    if (layer.textUnits.some((unit) => unit.editionId !== layer.edition.id))
      errors.push(`Text layer ${layer.edition.id} mixes editions.`);
    if (!sourceIds.has(layer.sourceId))
      errors.push(`Text layer ${layer.edition.id} references missing source ${layer.sourceId}.`);
    if (
      !hasAvailableData(layer.availability) ||
      layer.availability.data.map((unit) => unit.id).join("|") !==
        layer.textUnits.map((unit) => unit.id).join("|")
    )
      errors.push(`Text layer ${layer.edition.id} has inconsistent availability data.`);
  }

  for (const fragment of bundle.sources.fragments) {
    if (!sourceIds.has(fragment.sourceId)) {
      errors.push(`Fragment ${fragment.id} references missing source ${fragment.sourceId}.`);
    }
  }
  if (hasAvailableData(bundle.claims)) {
    for (const claim of bundle.claims.data) {
      if (!claim.anchors.length) errors.push(`Claim ${claim.id} has no anchors.`);
      for (const fragmentId of claim.sourceFragmentIds) {
        if (!fragmentIds.has(fragmentId)) {
          errors.push(`Claim ${claim.id} references missing fragment ${fragmentId}.`);
        }
      }
    }
  }
  if (hasAvailableData(bundle.relations)) {
    for (const relation of bundle.relations.data) {
      if (!relation.relation.value.trim()) errors.push(`Relation ${relation.id} has no type.`);
      for (const fragmentId of relation.sourceFragmentIds) {
        if (!fragmentIds.has(fragmentId)) {
          errors.push(`Relation ${relation.id} references missing fragment ${fragmentId}.`);
        }
      }
    }
  }
  if (hasAvailableData(bundle.originals)) {
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
