import type { PassageAnalysis, Perspective, StudyLens } from "./analysis";
import type { Availability } from "./availability";
import type { KnowledgeClaim, KnowledgeEntity, KnowledgeRelation } from "./knowledge";
import type { LibraryResource } from "./library";
import type {
  Edition,
  Lemma,
  PassageRef,
  TextUnit,
  TextualVariant,
  TokenOccurrence,
  VerseContent,
} from "./scripture";
import type { Provenance, SourceFragment, SourceReference } from "./source";
import type { Note, StudyItem } from "./study";
import type { LinguisticPassage } from "./linguistic";

export interface PassageKnowledgeIdentity {
  ref: PassageRef;
  label: string;
  key: string;
}

export interface PassageKnowledgeBundle {
  identity: PassageKnowledgeIdentity;
  passage: {
    verses: VerseContent[];
    editions: Edition[];
    textUnits: TextUnit[];
  };
  originals: Availability<TokenOccurrence[]>;
  lemmas: Availability<Lemma[]>;
  linguistics: Availability<LinguisticPassage>;
  variants: Availability<TextualVariant[]>;
  entities: Availability<KnowledgeEntity[]>;
  concepts: Availability<KnowledgeEntity[]>;
  relations: Availability<KnowledgeRelation[]>;
  claims: Availability<KnowledgeClaim[]>;
  crossReferences: Availability<KnowledgeRelation[]>;
  analyses: Availability<PassageAnalysis[]>;
  lenses: StudyLens[];
  perspectives: Perspective[];
  sources: {
    references: SourceReference[];
    fragments: SourceFragment[];
    resources: LibraryResource[];
  };
  user: {
    notes: Note[];
    studyLinks: StudyItem[];
  };
  provenance: Provenance;
}
