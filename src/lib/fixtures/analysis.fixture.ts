/** DEMO / SEED DATA — methodological lenses, not academic conclusions. */
import type { StudyLens } from "../domain/analysis";

export const STUDY_LENSES: StudyLens[] = [
  {
    id: "textual",
    label: "Textual criticism",
    shortLabel: "Text",
    description: "Compares editions, witnesses, variants and editorial decisions.",
    guidingQuestions: ["Which witnesses support this reading?", "Where do editions diverge?"],
    evidenceKinds: ["textual"],
  },
  {
    id: "philological",
    label: "Philology & language",
    shortLabel: "Language",
    description: "Studies grammar, syntax, lexemes, semantic range and discourse.",
    guidingQuestions: [
      "What does the form permit grammatically?",
      "How is this lemma used in its corpus?",
    ],
    evidenceKinds: ["linguistic", "textual"],
  },
  {
    id: "exegetical",
    label: "Exegesis",
    shortLabel: "Exegesis",
    description:
      "Investigates what the passage communicates in its literary and historical setting.",
    guidingQuestions: [
      "What is the argument of the passage?",
      "How does its immediate context constrain interpretation?",
    ],
    evidenceKinds: ["textual", "historical", "linguistic"],
  },
  {
    id: "hermeneutical",
    label: "Hermeneutics",
    shortLabel: "Hermeneutics",
    description: "Makes the assumptions and interpretive framework of a reading explicit.",
    guidingQuestions: [
      "Which horizon of interpretation is being used?",
      "What changes between ancient and present readers?",
    ],
    evidenceKinds: ["traditional", "theological"],
  },
  {
    id: "historical",
    label: "Historical inquiry",
    shortLabel: "History",
    description:
      "Examines chronology, material culture, institutions and the ancient social world.",
    guidingQuestions: [
      "What can primary evidence establish?",
      "Which reconstruction remains uncertain?",
    ],
    evidenceKinds: ["historical", "archaeological"],
  },
  {
    id: "history-of-religions",
    label: "History of religions",
    shortLabel: "Religions",
    description: "Compares practices and concepts without assuming one confessional canon.",
    guidingQuestions: [
      "Which ancient religious contexts are comparable?",
      "Where does comparison become anachronistic?",
    ],
    evidenceKinds: ["historical", "traditional"],
  },
  {
    id: "philosophy-of-religion",
    label: "Philosophy of religion",
    shortLabel: "Philosophy",
    description: "Examines concepts, arguments, epistemology and internal coherence.",
    guidingQuestions: [
      "Which concept is being asserted?",
      "What premises and consequences follow?",
    ],
    evidenceKinds: ["theological"],
  },
  {
    id: "metaphysical",
    label: "Metaphysical inquiry",
    shortLabel: "Metaphysics",
    description: "Maps claims about being, causality, mind, time and transcendence.",
    guidingQuestions: [
      "What kind of reality does this reading posit?",
      "Is the claim textual, philosophical or confessional?",
    ],
    evidenceKinds: ["theological", "traditional"],
  },
  {
    id: "scientific",
    label: "Science & natural philosophy",
    shortLabel: "Science",
    description:
      "Separates empirical claims from genre, ancient cosmology and modern scientific models.",
    guidingQuestions: [
      "Is the text making an empirical claim?",
      "Would this comparison commit a category error?",
    ],
    evidenceKinds: ["historical", "archaeological"],
  },
  {
    id: "reception-history",
    label: "Reception history",
    shortLabel: "Reception",
    description:
      "Traces how communities, thinkers, arts and institutions have interpreted the passage.",
    guidingQuestions: [
      "Who interpreted it this way, and when?",
      "Which tradition or social setting shaped that reading?",
    ],
    evidenceKinds: ["traditional", "historical", "theological"],
  },
];
