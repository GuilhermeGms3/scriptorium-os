import type { ExplorerEntity, KnowledgeExplorerBundle } from "./knowledge-query-service";
import type { StudyGuide } from "../content/study-guides";
import { studyGuideById } from "../content/study-guides";
import { knowledgeSourceLinks } from "../content/knowledge-presentation";
import { studyEntityTitle } from "../content/study-knowledge";
import type { Note, NoteLink, Study } from "../domain/study";
import type { StudySource } from "../domain/study-notebook";
import type { CorpusSearchHit } from "../corpus-runtime/contracts";
import type { PrivateDocumentSearchHit } from "../domain/private-document";
import type { SourceFragment, SourceReference } from "../domain/source";
import {
  PrimarySourceRepository,
  type PrimarySourceWorkSummary,
} from "../repositories/primary-source-repository";
import { PrivateDocumentRepository } from "../repositories/private-document-repository";
import { KnowledgeRepository } from "../repositories/knowledge-repository";
import { StudyRepository } from "../repositories/study-repository";
import { loadCuratedTopicReadings } from "./curated-topic-readings";
import { thematicReadings } from "../repositories/thematic-reading-repository";

export interface StudyTopic {
  id: string;
  kind: "entity" | "guide";
  title: string;
  description: string;
  terms: string[];
  guide?: StudyGuide;
}
export interface TopicReading {
  id: string;
  title: string;
  locator: string;
  excerpt: string;
  language?: string;
  origin: "catalog" | "primary-search" | "private-search" | "private-curated";
  guidance?: string;
  source: StudySource;
}
export interface TopicReadings {
  items: TopicReading[];
  warnings: string[];
  evidence: { references: SourceReference[]; fragments: SourceFragment[] };
}

/** Explicit curriculum correspondence, never an academic relationship inferred from a word. */
const ENTITY_GUIDES: Readonly<Record<string, string>> = {
  "topic:christology": "trindade-cristologia",
  "doctrine:trinity": "trindade-cristologia",
  "doctrine:incarnation": "trindade-cristologia",
  "doctrine:two-natures": "trindade-cristologia",
  "topic:soteriology": "etica-soteriologia",
  "topic:atonement": "etica-soteriologia",
  "topic:hamartiology": "hamartiologia-justificacao",
  "topic:justification": "hamartiologia-justificacao",
  "topic:sanctification": "sacramentos-santificacao",
  "topic:sacramentology": "sacramentos-santificacao",
  "doctrine:baptism": "sacramentos-santificacao",
  "doctrine:eucharist": "sacramentos-santificacao",
  "topic:ecclesiology": "eclesiologia-liturgia",
  "topic:eschatology": "escatologia",
  "topic:pneumatology": "pneumatologia",
  "topic:bibliology": "hermeneutica-metodos",
  "method:reception-history": "exegese-recepcao",
  "method:theological-interpretation": "hermeneutica-metodos",
};

export function editorialEntityIdsForGuide(guideId: string): string[] {
  return Object.entries(ENTITY_GUIDES)
    .filter(([, id]) => id === guideId)
    .map(([entityId]) => entityId);
}

const TERM_ALIASES: Readonly<Record<string, string>> = {
  teologia: "theology",
  trindade: "trinity",
  cristologia: "Christ",
  encarnação: "incarnation",
  salvação: "salvation",
  expiação: "atonement",
  escatologia: "resurrection",
  pneumatologia: "Spirit",
  pecado: "sin",
  hamartiologia: "sin",
  justificação: "justification",
  sacramento: "sacrament",
  sacramentos: "sacrament",
  santificação: "sanctification",
  patrística: "apostles",
  eclesiologia: "church",
  exegese: "exegesis",
  hermenêutica: "interpretation",
  gnosticismo: "gnostic",
  doutrina: "doctrine",
};
export function describeStudyGuide(guide: StudyGuide): StudyTopic {
  return {
    id: `study-guide:${guide.id}`,
    kind: "guide",
    title: guide.title,
    description: guide.introduction,
    terms: [
      ...new Set(
        guide.keywords.flatMap((term) => [
          term,
          ...(TERM_ALIASES[term.toLocaleLowerCase("pt-BR")]
            ? [TERM_ALIASES[term.toLocaleLowerCase("pt-BR")]!]
            : []),
        ]),
      ),
    ].slice(0, 3),
    guide,
  };
}
export function describeStudyEntity(item: ExplorerEntity): StudyTopic {
  const title = studyEntityTitle(item);
  const canonical = item.kind === "knowledge" ? item.entity.name : item.entity.labels.canonicalName;
  const guideId = ENTITY_GUIDES[item.entity.id];
  const guide = guideId ? studyGuideById(guideId) : undefined;
  return {
    id: item.entity.id,
    kind: "entity",
    title,
    description:
      item.entity.description ??
      "Conheça o assunto, aprofunde a leitura nas fontes e reúna suas próprias notas.",
    terms: [...new Set([title, canonical])],
    ...(guide ? { guide } : {}),
  };
}
export function topicNoteLinks(topic: StudyTopic): NoteLink[] {
  return [{ kind: "concept", target: topic.id, label: topic.title }];
}
export function studiesForTopic(
  topic: StudyTopic,
  studies: readonly Study[],
  notes: readonly Note[],
): Study[] {
  const directGroups = new Set(
    notes
      .filter((note) =>
        note.links.some((link) => link.kind === "concept" && link.target === topic.id),
      )
      .flatMap((note) =>
        note.links.filter((link) => link.kind === "study").map((link) => link.target),
      ),
  );
  return studies.filter(
    (study) =>
      directGroups.has(study.id) ||
      study.items.some((item) => item.kind === "concept" && item.refId === topic.id),
  );
}
export function notesForTopic(
  topic: StudyTopic,
  studies: readonly Study[],
  notes: readonly Note[],
): Note[] {
  const groupIds = new Set(
    studies
      .filter((study) =>
        study.items.some((item) => item.kind === "concept" && item.refId === topic.id),
      )
      .map((study) => study.id),
  );
  return notes.filter((note) =>
    note.links.some(
      (link) =>
        (link.kind === "concept" && link.target === topic.id) ||
        (link.kind === "study" && groupIds.has(link.target)),
    ),
  );
}

export async function connectTopicStudy(topic: StudyTopic, studyId?: string): Promise<Study> {
  await StudyRepository.refresh();
  const existing = studyId
    ? StudyRepository.listStudies().find((study) => study.id === studyId)
    : studiesForTopic(topic, StudyRepository.listStudies(), StudyRepository.listNotes())[0];
  if (studyId && !existing) throw new Error("Este grupo não existe mais. Escolha outro.");
  const study = existing ?? (await StudyRepository.createStudy(topic.title));
  if (!study.items.some((item) => item.kind === "concept" && item.refId === topic.id))
    await StudyRepository.addStudyItem(study.id, {
      kind: "concept",
      refId: topic.id,
      label: topic.title,
    });
  return study;
}

interface ReadingDependencies {
  curated?: (id: string) => Promise<{ items: TopicReading[]; warnings: string[] }>;
  works: () => Promise<PrimarySourceWorkSummary[]>;
  primary: (query: string, limit: number) => Promise<CorpusSearchHit[]>;
  private: (query: string, options: { limit: number }) => Promise<PrivateDocumentSearchHit[]>;
  evidence: (ids: string[]) => Promise<TopicReadings["evidence"]>;
}
const dependencies: ReadingDependencies = {
  curated: async (id) => {
    const [selected, structured] = await Promise.allSettled([
      loadCuratedTopicReadings(id),
      thematicReadings(id),
    ]);
    return {
      items: [
        ...(selected.status === "fulfilled" ? selected.value.items : []),
        ...(structured.status === "fulfilled" ? structured.value : []),
      ],
      warnings: [
        ...(selected.status === "fulfilled"
          ? selected.value.warnings
          : ["Leituras selecionadas indisponíveis."]),
        ...(structured.status === "rejected"
          ? ["A estrutura temática do acervo não pôde ser consultada."]
          : []),
      ],
    };
  },
  works: () => PrimarySourceRepository.listWorks(),
  primary: (query, limit) => PrimarySourceRepository.search(query, limit),
  private: (query, options) => PrivateDocumentRepository.search(query, options),
  evidence: (ids) => KnowledgeRepository.sourcesForClaims(ids),
};

/** Bounded FTS discovery, with exact anchors. A search hit is never promoted to a verified link. */
export async function loadTopicReadings(
  topic: StudyTopic,
  bundle?: KnowledgeExplorerBundle,
  sources: ReadingDependencies = dependencies,
): Promise<TopicReadings> {
  const terms = [...new Set(topic.terms.map((term) => term.trim()).filter(Boolean))].slice(0, 3);
  const [catalog, primary, privateHits, evidence, curated] = await Promise.all([
    Promise.allSettled([sources.works()]),
    Promise.allSettled(terms.map((term) => sources.primary(term, 5))),
    Promise.allSettled(terms.map((term) => sources.private(term, { limit: 4 }))),
    Promise.allSettled([sources.evidence(bundle?.claims.map((claim) => claim.id) ?? [])]),
    Promise.allSettled([
      sources.curated?.(topic.id) ?? Promise.resolve({ items: [], warnings: [] }),
    ]),
  ]);
  const works = catalog[0]?.status === "fulfilled" ? catalog[0].value : [];
  const byId = new Map(works.map((work) => [work.id, work]));
  const assigned =
    topic.kind === "guide" ? (topic.guide?.resources ?? []) : knowledgeSourceLinks(topic.id);
  const items = new Map<string, TopicReading>();
  if (curated[0]?.status === "fulfilled")
    for (const reading of curated[0].value.items) items.set(reading.id, reading);
  for (const resource of assigned) {
    const work = byId.get(resource.workId);
    if (work)
      items.set(`work:${work.id}`, {
        id: `work:${work.id}`,
        title: work.title,
        locator: work.editionTitle,
        excerpt: "",
        language: work.language,
        origin: "catalog",
        source: { kind: "primary-text", workId: work.id, title: work.title },
      });
  }
  for (const result of primary)
    if (result.status === "fulfilled")
      for (const hit of result.value) {
        const work = byId.get(hit.textUnit.workId);
        if (!work || hit.textUnit.provenance.isDemo) continue;
        items.set(hit.textUnit.id, {
          id: hit.textUnit.id,
          title: work.title,
          locator: hit.textUnit.displayAddress ?? `Unidade ${hit.textUnit.sequence}`,
          excerpt: hit.textUnit.text,
          language: hit.textUnit.language,
          origin: "primary-search",
          source: {
            kind: "primary-text",
            workId: work.id,
            unitId: hit.textUnit.id,
            title: work.title,
          },
        });
      }
  for (const result of privateHits)
    if (result.status === "fulfilled")
      for (const hit of result.value) {
        const id = `${hit.documentId}:${hit.pageIndex}`;
        items.set(id, {
          id,
          title: hit.title,
          locator: `p. ${hit.pageLabel || hit.pageIndex + 1}`,
          excerpt: hit.snippet,
          origin: "private-search",
          source: {
            kind: "private-document",
            documentId: hit.documentId,
            page: hit.pageIndex + 1,
            title: hit.title,
          },
        });
      }
  const failed = (results: readonly PromiseSettledResult<unknown>[]) =>
    results.some((result) => result.status === "rejected");
  return {
    items: (["private-curated", "catalog", "primary-search", "private-search"] as const).flatMap(
      (origin) =>
        [...items.values()]
          .filter((item) => item.origin === origin)
          .slice(0, origin === "private-curated" ? 80 : 8),
    ),
    evidence:
      evidence[0]?.status === "fulfilled" ? evidence[0].value : { references: [], fragments: [] },
    warnings: [
      ...([...items.values()].filter((item) => item.origin === "private-curated").length > 80
        ? ["Mostrando as primeiras 80 leituras estruturadas. Consulte a obra para continuar."]
        : []),
      ...(curated[0]?.status === "fulfilled"
        ? curated[0].value.warnings
        : ["Não foi possível conferir as leituras selecionadas do acervo."]),
      ...(failed(catalog) || failed(primary)
        ? ["A consulta às obras instaladas está incompleta."]
        : []),
      ...(failed(privateHits)
        ? [
            "O acervo privado está indisponível neste momento. As demais fontes continuam acessíveis.",
          ]
        : []),
      ...(failed(evidence) ? ["Não foi possível conferir todas as evidências do catálogo."] : []),
    ],
  };
}
