import { HUMANITY_DEVELOPMENT } from "./development-humanity";
import { REASON_DEVELOPMENT } from "./development-reason";
import { CHRIST_DEVELOPMENT } from "./development-christ";
import { GRACE_DEVELOPMENT } from "./development-grace";
import { TRADITIONS_DEVELOPMENT } from "./development-traditions";
import { DEVELOPMENT_FOUNDATIONS } from "./development-foundations";
import { DEVELOPMENT_CONNECTIONS } from "./development-connections";
import type { LessonDevelopment } from "./development-types";
import type { FormationUnit } from "./unit";

export const FALL_GRACE_DEVELOPMENT: Readonly<Record<string, LessonDevelopment>> = {
  ...HUMANITY_DEVELOPMENT,
  ...REASON_DEVELOPMENT,
  ...CHRIST_DEVELOPMENT,
  ...GRACE_DEVELOPMENT,
  ...TRADITIONS_DEVELOPMENT,
};

/** Add exposition in place: no new required lesson, passage, revision or progress identity. */
export function developFallGraceModule(module: FormationUnit): FormationUnit {
  return {
    ...module,
    lessons: module.lessons.map((lesson) => {
      const development = FALL_GRACE_DEVELOPMENT[lesson.id];
      if (!development) throw new Error(`Aprofundamento ausente: ${lesson.id}`);
      return {
        ...lesson,
        sections: lesson.sections.map((section) => ({
          ...section,
          paragraphs: [...section.paragraphs, ...development.paragraphs[section.kind]],
          references:
            section.kind === "concept" || section.kind === "discussion"
              ? [...new Set([...section.references, ...development.references])]
              : section.references,
        })),
      };
    }),
    foundation: [...(module.foundation ?? []), ...(DEVELOPMENT_FOUNDATIONS[module.id] ?? [])],
    connections: [...module.connections, ...(DEVELOPMENT_CONNECTIONS[module.id] ?? [])],
  };
}
