import type { Book } from "../domain/scripture";

export interface ScriptureBookGroup {
  id: string;
  label: string;
  description: string;
  books: Book[];
}

const GROUPS = [
  {
    id: "pentateuco",
    label: "Pentateuco",
    description: "Torá · cinco livros",
    ids: ["genesis", "exodus", "leviticus", "numbers", "deuteronomy"],
  },
  {
    id: "historicos",
    label: "Históricos",
    description: "Narrativas de Israel",
    ids: [
      "joshua",
      "judges",
      "ruth",
      "1-samuel",
      "2-samuel",
      "1-kings",
      "2-kings",
      "1-chronicles",
      "2-chronicles",
      "ezra",
      "nehemiah",
      "esther",
    ],
  },
  {
    id: "poeticos",
    label: "Poéticos e sapienciais",
    description: "Poesia, oração e sabedoria",
    ids: ["job", "psalms", "proverbs", "ecclesiastes", "song-of-songs"],
  },
  {
    id: "profetas-maiores",
    label: "Profetas maiores",
    description: "Isaías a Daniel",
    ids: ["isaiah", "jeremiah", "lamentations", "ezekiel", "daniel"],
  },
  {
    id: "profetas-menores",
    label: "Profetas menores",
    description: "Os Doze",
    ids: [
      "hosea",
      "joel",
      "amos",
      "obadiah",
      "jonah",
      "micah",
      "nahum",
      "habakkuk",
      "zephaniah",
      "haggai",
      "zechariah",
      "malachi",
    ],
  },
  {
    id: "evangelhos-atos",
    label: "Evangelhos e Atos",
    description: "Jesus e a igreja nascente",
    ids: ["matthew", "mark", "luke", "john", "acts"],
  },
  {
    id: "cartas-paulinas",
    label: "Cartas paulinas",
    description: "Romanos a Filemom",
    ids: [
      "romans",
      "1-corinthians",
      "2-corinthians",
      "galatians",
      "ephesians",
      "philippians",
      "colossians",
      "1-thessalonians",
      "2-thessalonians",
      "1-timothy",
      "2-timothy",
      "titus",
      "philemon",
    ],
  },
  {
    id: "cartas-gerais",
    label: "Cartas gerais",
    description: "Hebreus a Judas",
    ids: ["hebrews", "james", "1-peter", "2-peter", "1-john", "2-john", "3-john", "jude"],
  },
  {
    id: "apocaliptico",
    label: "Apocalíptico",
    description: "Apocalipse de João",
    ids: ["revelation"],
  },
] as const;

export function groupScriptureBooks(books: readonly Book[]): ScriptureBookGroup[] {
  const byId = new Map(books.map((book) => [book.id, book]));
  const consumed = new Set<string>();
  const groups: ScriptureBookGroup[] = GROUPS.map((group) => {
    const matches = group.ids.flatMap((id) => {
      const book = byId.get(id);
      if (!book) return [];
      consumed.add(id);
      return [book];
    });
    return { id: group.id, label: group.label, description: group.description, books: matches };
  }).filter((group) => group.books.length > 0);

  const additional = books.filter((book) => !consumed.has(book.id));
  if (additional.length > 0) {
    groups.push({
      id: "deuterocanonicos-outros",
      label: "Deuterocanônicos e outros textos",
      description: "Coleções que variam conforme a tradição",
      books: additional,
    });
  }
  return groups;
}
