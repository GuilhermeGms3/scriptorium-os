import type { Study } from "../../lib/domain/study";
import { StudyHub } from "./study-hub";

export function StudyLearningMap({
  onSelectEntity,
}: {
  studies: readonly Study[];
  onSelectEntity: (id: string) => void;
}) {
  return <StudyHub onSelectEntity={onSelectEntity} />;
}
