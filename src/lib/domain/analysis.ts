import type { ClaimKind, EvidenceKind, ReviewStatus, TextAnchor } from "./knowledge";
import type { PerspectiveProfile } from "./perspective";

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

/** @deprecated Use PerspectiveProfile; retained while analysis panels migrate. */
export type Perspective = PerspectiveProfile;

export interface PassageAnalysis {
  id: string;
  anchor: TextAnchor;
  lensId: StudyLensId;
  /** @deprecated Use perspectiveProfileIds. */
  perspectiveId?: string;
  perspectiveProfileIds?: string[];
  title: string;
  summary?: string;
  status: AnalysisStatus;
  reviewStatus: ReviewStatus;
  interpretationKind: ClaimKind;
  sourceFragmentIds: string[];
  authorNote?: string;
}
