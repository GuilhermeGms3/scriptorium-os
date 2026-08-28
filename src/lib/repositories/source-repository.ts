import type { PassageRef } from "../domain/scripture";
import { passageRefsOverlap } from "../domain/scripture";
import type { SourceFragment, SourceReference } from "../domain/source";
import { DEMO_SOURCE_FRAGMENTS, DEMO_SOURCE_REFERENCES } from "../fixtures/source.fixture";

export const SourceRepository = {
  listReferences(): SourceReference[] {
    return DEMO_SOURCE_REFERENCES;
  },

  getReference(id: string): SourceReference | null {
    return DEMO_SOURCE_REFERENCES.find((source) => source.id === id) ?? null;
  },

  listFragments(): SourceFragment[] {
    return DEMO_SOURCE_FRAGMENTS;
  },

  getFragment(id: string): SourceFragment | null {
    return DEMO_SOURCE_FRAGMENTS.find((fragment) => fragment.id === id) ?? null;
  },

  fragmentsForPassage(ref: PassageRef): SourceFragment[] {
    return DEMO_SOURCE_FRAGMENTS.filter(
      (fragment) => fragment.passage && passageRefsOverlap(fragment.passage, ref),
    );
  },
};
