import type { Study } from "../domain/study";
import { STUDY_PATHS, type StudyPath } from "./study-paths";

export type StudyJourneyId = "biblia" | "teologia" | "historia" | "literatura";

export type StudyMapNodeKind = "origin" | "journey" | "path";

export interface StudyMapNode {
  id: string;
  kind: StudyMapNodeKind;
  title: string;
  shortTitle: string;
  description: string;
  journeyId?: StudyJourneyId;
  pathId?: string;
  x: number;
  y: number;
}

export interface StudyMapEdge {
  from: string;
  to: string;
}

export type StudyPathState = "available" | "started" | "collection-gap";

export interface StudyPathProgress {
  state: StudyPathState;
  study?: Study;
  collectedItems: number;
}

export interface StudyJourney {
  id: StudyJourneyId;
  title: string;
  eyebrow: string;
  description: string;
  branch: StudyPath["branch"];
}

export const STUDY_JOURNEYS: readonly StudyJourney[] = [
  {
    id: "biblia",
    title: "Bíblia e interpretação",
    eyebrow: "Texto e método",
    description: "Do texto à interpretação: exegese, recepção, hermenêutica e controle das fontes.",
    branch: "Bíblia e interpretação",
  },
  {
    id: "teologia",
    title: "Teologia sistemática",
    eyebrow: "Doutrina e debate",
    description:
      "Doutrinas relacionadas sem confundir tradição, método, posição e evidência textual.",
    branch: "Teologia",
  },
  {
    id: "historia",
    title: "História e tradições",
    eyebrow: "Recepção e comunidade",
    description:
      "Fontes primárias, práticas comunitárias e desenvolvimento histórico das tradições.",
    branch: "História e tradições",
  },
  {
    id: "literatura",
    title: "Literatura e fontes",
    eyebrow: "Coleções antigas",
    description: "Textos antigos, coleções não canônicas e seus contextos documentais.",
    branch: "Literatura e fontes",
  },
] as const;

const PATH_POSITIONS: Readonly<Record<string, { x: number; y: number }>> = {
  "exegese-recepcao": { x: 145, y: 145 },
  "hermeneutica-metodos": { x: 315, y: 96 },
  "trindade-cristologia": { x: 745, y: 92 },
  "etica-soteriologia": { x: 905, y: 145 },
  escatologia: { x: 925, y: 285 },
  pneumatologia: { x: 772, y: 315 },
  "hamartiologia-justificacao": { x: 850, y: 430 },
  "sacramentos-santificacao": { x: 690, y: 465 },
  patristica: { x: 160, y: 505 },
  "eclesiologia-liturgia": { x: 310, y: 600 },
  gnosticismo: { x: 810, y: 610 },
};

const JOURNEY_POSITIONS: Readonly<Record<StudyJourneyId, { x: number; y: number }>> = {
  biblia: { x: 305, y: 245 },
  teologia: { x: 730, y: 245 },
  historia: { x: 320, y: 480 },
  literatura: { x: 690, y: 560 },
};

const SHORT_TITLES: Readonly<Record<string, string>> = {
  "exegese-recepcao": "Exegese",
  "hermeneutica-metodos": "Hermenêutica",
  "trindade-cristologia": "Cristologia",
  "etica-soteriologia": "Soteriologia",
  escatologia: "Escatologia",
  pneumatologia: "Pneumatologia",
  "hamartiologia-justificacao": "Hamartiologia",
  "sacramentos-santificacao": "Sacramentos",
  patristica: "Patrística",
  "eclesiologia-liturgia": "Eclesiologia",
  gnosticismo: "Nag Hammadi",
};

export const STUDY_MAP_NODES: readonly StudyMapNode[] = [
  {
    id: "study-origin",
    kind: "origin",
    title: "Teologia",
    shortTitle: "Teologia",
    description:
      "Escolha uma direção. O mapa organiza fontes e perguntas; ele não presume domínio nem conclusão teológica.",
    x: 520,
    y: 355,
  },
  ...STUDY_JOURNEYS.map((journey) => ({
    id: `journey:${journey.id}`,
    kind: "journey" as const,
    title: journey.title,
    shortTitle: journey.title,
    description: journey.description,
    journeyId: journey.id,
    ...JOURNEY_POSITIONS[journey.id],
  })),
  ...STUDY_PATHS.map((path) => {
    const journey = STUDY_JOURNEYS.find((candidate) => candidate.branch === path.branch);
    const position = PATH_POSITIONS[path.id];
    if (!journey || !position) throw new Error(`Study map placement missing for ${path.id}.`);
    return {
      id: `path:${path.id}`,
      kind: "path" as const,
      title: path.title,
      shortTitle: SHORT_TITLES[path.id] ?? path.title,
      description: path.description,
      journeyId: journey.id,
      pathId: path.id,
      ...position,
    };
  }),
] as const;

export const STUDY_MAP_EDGES: readonly StudyMapEdge[] = [
  ...STUDY_JOURNEYS.map((journey) => ({
    from: "study-origin",
    to: `journey:${journey.id}`,
  })),
  ...STUDY_PATHS.map((path) => {
    const journey = STUDY_JOURNEYS.find((candidate) => candidate.branch === path.branch);
    if (!journey) throw new Error(`Study journey missing for ${path.id}.`);
    return { from: `journey:${journey.id}`, to: `path:${path.id}` };
  }),
] as const;

function normalizeStudyTitle(value: string): string {
  return value.trim().toLocaleLowerCase("pt-BR");
}

export function studyPathById(pathId: string): StudyPath | undefined {
  return STUDY_PATHS.find((path) => path.id === pathId);
}

export function studyPathProgress(path: StudyPath, studies: readonly Study[]): StudyPathProgress {
  const study = studies.find(
    (candidate) =>
      candidate.items.some((item) => item.refId === `study-guide:${path.id}`) ||
      normalizeStudyTitle(candidate.title) === normalizeStudyTitle(path.title),
  );
  if (study) return { state: "started", study, collectedItems: study.items.length };
  if (path.resources.length === 0) return { state: "collection-gap", collectedItems: 0 };
  return { state: "available", collectedItems: 0 };
}

export function journeyStartCount(journey: StudyJourney, studies: readonly Study[]): number {
  return STUDY_PATHS.filter((path) => path.branch === journey.branch).filter(
    (path) => studyPathProgress(path, studies).state === "started",
  ).length;
}
