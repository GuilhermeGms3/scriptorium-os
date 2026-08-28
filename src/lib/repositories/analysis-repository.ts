import type { PassageAnalysis, Perspective, StudyLens } from "../domain/analysis";
import type { PassageRef } from "../domain/scripture";
import { STUDY_LENSES } from "../fixtures/analysis.fixture";

/** Analysis remains intentionally empty until source-backed records are imported. */
export const AnalysisRepository = {
  listLenses(): StudyLens[] {
    return STUDY_LENSES;
  },

  listPerspectives(): Perspective[] {
    return [];
  },

  analysesForPassage(_ref: PassageRef): PassageAnalysis[] {
    return [];
  },
};
