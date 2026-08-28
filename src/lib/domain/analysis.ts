import type { ClaimKind, EvidenceKind, ReviewStatus, TextAnchor } from "./knowledge";

export type StudyLensId =
  | "textual"
  | "philological"
  | "exegetical"
  | "hermeneutical"
  | "historical"
  | "history-of-religions"
  | "philosophy-of-religion"
  | "metaphysical"
  | "scientific"
  | "reception-history";

export type AnalysisStatus = "placeholder" | "draft" | "reviewed";

export interface StudyLens {
  id: StudyLensId;
  label: string;
  shortLabel: string;
  description: string;
  guidingQuestions: string[];
  /** Lenses describe methods. They are never truth or confidence scores. */
  evidenceKinds: EvidenceKind[];
}

export interface Perspective {
  id: string;
  label: string;
  description?: string;
  traditionIds?: string[];
}

export interface PassageAnalysis {
  id: string;
  anchor: TextAnchor;
  lensId: StudyLensId;
  perspectiveId?: string;
  title: string;
  summary?: string;
  status: AnalysisStatus;
  reviewStatus: ReviewStatus;
  interpretationKind: ClaimKind;
  sourceFragmentIds: string[];
  authorNote?: string;
}
