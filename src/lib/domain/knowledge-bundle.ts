import type { PassageAnalysis, Perspective, StudyLens } from "./analysis";
import type { Argument } from "./argument";
import type { Availability, AvailabilityStatus } from "./availability";
import type { KnowledgeClaim, KnowledgeEntity, KnowledgeRelation } from "./knowledge";
import type { PerspectiveProfile } from "./perspective";
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
import type {
  Lexeme,
  LexicalOccurrence,
  LinguisticAnnotation,
  MorphologicalAnalysis,
  TokenAlignment,
  LexicalDictionaryEntry,
} from "./linguistic";

export interface PassageKnowledgeIdentity {
  ref: PassageRef;
  label: string;
  key: string;
}

export interface ScriptureTextLayer {
  edition: Edition;
  editionId: string;
  language: Edition["language"];
  text: string;
  sourceId: string;
  textUnits: TextUnit[];
  availability: Availability<TextUnit[]>;
  provenance: Provenance;
}

export interface PassageKnowledgeAvailability {
  passage: AvailabilityStatus;
  texts: AvailabilityStatus;
  original: AvailabilityStatus;
  words: AvailabilityStatus;
  linguisticAnnotations: AvailabilityStatus;
  concordance: AvailabilityStatus;
  entities: AvailabilityStatus;
  relations: AvailabilityStatus;
  claims: AvailabilityStatus;
  evidence: AvailabilityStatus;
  sources: AvailabilityStatus;
  perspectives: AvailabilityStatus;
  viewpoints: AvailabilityStatus;
  study: AvailabilityStatus;
}

/**
 * Claims of a passage grouped by the perspective profile a cited source attributes them to. A
 * claim with no linked profile belongs to the `profile: null` group; no profile is ever inferred.
 */
export interface PassageViewpoint {
  profile: PerspectiveProfile | null;
  claims: KnowledgeClaim[];
  supportingArguments: Argument[];
  opposingArguments: Argument[];
}

export interface PassageKnowledgeBundle {
  identity: PassageKnowledgeIdentity;
  passage: {
    verses: VerseContent[];
    editions: Edition[];
    textUnits: TextUnit[];
  };
  texts: ScriptureTextLayer[];
  words: Availability<TokenOccurrence[]>;
  linguisticAnnotations: Availability<LinguisticAnnotation[]>;
  concordance: Availability<{ lexemeIds: string[]; lookup: "lazy-by-lexeme" }>;
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
  viewpoints: Availability<PassageViewpoint[]>;
  evidence: Availability<SourceFragment[]>;
  lenses: StudyLens[];
  perspectives: Perspective[];
  sources: {
    references: SourceReference[];
    fragments: SourceFragment[];
  };
  user: {
    notes: Note[];
    studyLinks: StudyItem[];
  };
  availability: PassageKnowledgeAvailability;
  provenance: Provenance;
}

export interface WordKnowledgeBundle {
  token: TokenOccurrence;
  alignment: Availability<TokenAlignment>;
  annotation: Availability<LinguisticAnnotation>;
  lexeme: Availability<Lexeme>;
  dictionary: Availability<LexicalDictionaryEntry[]>;
  morphology: Availability<MorphologicalAnalysis[]>;
  concordance: Availability<{
    total: number;
    offset: number;
    items: LexicalOccurrence[];
  }>;
  sources: {
    references: SourceReference[];
    fragments: SourceFragment[];
  };
  user: {
    notes: Note[];
    studyLinks: StudyItem[];
  };
  provenance: Provenance[];
}
