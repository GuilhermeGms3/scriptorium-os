import { createHash } from "node:crypto";

export interface ParsedPrimaryUnit {
  id: string;
  sequence: number;
  section: string;
  title?: string;
  text: string;
}

export interface ParsedPrimaryWork {
  id: string;
  title: string;
  aliases: string[];
  language: string;
  sourceId: string;
  units: ParsedPrimaryUnit[];
}

interface WorkDefinition {
  id: string;
  title: string;
  aliases?: string[];
  start: string;
  end: string;
}

const normalizeLines = (value: string): string =>
  value
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/([A-Za-z])-[ \t]*\n([a-z])/g, "$1$2")
    .replace(/[ \t]+\n/g, "\n");

const cleanBody = (value: string): string =>
  normalizeLines(value)
    .replace(/^\s*Footnote \d+:[\s\S]*$/m, "")
    .replace(/^\s*\[[0-9]+\]\s*$/gm, "")
    .replace(/\[(\d+)\]/g, "[$1]")
    .replace(/_([^_\n]+)_/g, "$1")
    .replace(/“|”/g, '"')
    .replace(/‘|’/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+/g, " ")
    .trim();

function stableUnitId(workId: string, section: string): string {
  const digest = createHash("sha256").update(`${workId}:${section}`).digest("hex").slice(0, 20);
  return `textunit:primary-sources:${workId}:${digest}`;
}

function romanToNumber(value: string): number {
  const values: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 };
  let total = 0;
  let previous = 0;
  for (const character of [...value.toUpperCase()].reverse()) {
    const current = values[character] ?? 0;
    total += current < previous ? -current : current;
    previous = current;
  }
  return total;
}

function bounded(raw: string, start: string, end: string): string {
  const normalized = normalizeLines(raw);
  const pattern = (marker: string) =>
    new RegExp(marker.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"), "i");
  const startMatch = pattern(start).exec(normalized);
  if (!startMatch || startMatch.index === undefined)
    throw new Error(`Primary-source start marker not found: ${start}`);
  const tail = normalized.slice(startMatch.index + startMatch[0].length);
  const endMatch = pattern(end).exec(tail);
  if (!endMatch) throw new Error(`Primary-source end marker not found: ${end}`);
  return tail.slice(0, endMatch.index);
}

function chapterUnits(workId: string, raw: string): ParsedPrimaryUnit[] {
  const normalizedWithNotes = normalizeLines(raw);
  const notesAt = normalizedWithNotes.search(/^Footnote \d+:/m);
  const normalized = notesAt >= 0 ? normalizedWithNotes.slice(0, notesAt) : normalizedWithNotes;
  const matches = [...normalized.matchAll(/^\s*CHAP\.\s+([IVXLCDM]+)\.?[—.-]*\s*_?([^\n]*)/gim)];
  if (!matches.length) throw new Error(`No chapters found for ${workId}.`);
  return matches.map((match, index) => {
    const section = String(romanToNumber(match[1]!));
    const bodyStart = (match.index ?? 0) + match[0].length;
    const bodyEnd = matches[index + 1]?.index ?? normalized.length;
    const text = cleanBody(normalized.slice(bodyStart, bodyEnd));
    if (!text) throw new Error(`Empty chapter ${section} in ${workId}.`);
    const title = cleanBody(match[2] ?? "");
    return {
      id: stableUnitId(workId, section),
      sequence: index + 1,
      section,
      ...(title ? { title } : {}),
      text,
    };
  });
}

export function parseDidache(raw: string): ParsedPrimaryWork {
  const english = bounded(
    raw,
    "Teaching of the Lord, through the Twelve Apostles,\nto the Nations.",
    "USE OF THE HOLY SCRIPTURES IN THE “TEACHING.”",
  );
  const normalized = normalizeLines(english);
  const matches = [...normalized.matchAll(/^Chap\.?\s*([IVXLCDM]+):?\s*(\d+)?\s*[—-]\s*/gim)];
  if (matches.length !== 16) throw new Error(`Didache expected 16 chapters; found ${matches.length}.`);
  const units = matches.map((match, index) => {
    const section = String(romanToNumber(match[1]!));
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? normalized.length;
    const text = cleanBody(normalized.slice(start, end));
    if (!text) throw new Error(`Empty Didache chapter ${section}.`);
    return { id: stableUnitId("work:didache", section), sequence: index + 1, section, text };
  });
  return {
    id: "work:didache",
    title: "The Didache",
    aliases: ["Didache", "Didaquê", "Didakhé", "Διδαχή", "Teaching of the Twelve Apostles"],
    language: "en",
    sourceId: "source:gutenberg:42053",
    units,
  };
}

const APOSTOLIC_WORKS: WorkDefinition[] = [
  {
    id: "work:first-clement",
    title: "The First Epistle of Clement to the Corinthians",
    aliases: ["1 Clement", "Primeira Epístola de Clemente", "First Clement"],
    start: "THE FIRST EPISTLE OF CLEMENT TO THE CORINTHIANS.[1]",
    end: "THE SECOND EPISTLE OF CLEMENT.",
  },
  {
    id: "work:second-clement",
    title: "The Second Epistle of Clement",
    aliases: ["2 Clement", "Segunda Epístola de Clemente", "Second Clement"],
    start: "THE SECOND EPISTLE OF CLEMENT.[259]",
    end: "THE EPISTLE OF POLYCARP.",
  },
  {
    id: "work:polycarp-philippians",
    title: "The Epistle of Polycarp to the Philippians",
    aliases: ["Polycarp to the Philippians", "Policarpo aos Filipenses"],
    start: "THE EPISTLE OF POLYCARP TO THE PHILIPPIANS.[316]",
    end: "THE MARTYRDOM OF POLYCARP.",
  },
  {
    id: "work:martyrdom-polycarp",
    title: "The Martyrdom of Polycarp",
    aliases: ["Martírio de Policarpo"],
    start: "CONCERNING THE MARTYRDOM OF THE HOLY POLYCARP.",
    end: "THE EPISTLE OF BARNABAS.",
  },
  {
    id: "work:epistle-barnabas",
    title: "The Epistle of Barnabas",
    aliases: ["Barnabas", "Epístola de Barnabé"],
    start: "THE EPISTLE OF BARNABAS.[457]",
    end: "THE EPISTLES OF IGNATIUS.",
  },
  {
    id: "work:epistle-diognetus",
    title: "The Epistle to Diognetus",
    aliases: ["Diognetus", "Epístola a Diogneto"],
    start: "THE EPISTLE TO DIOGNETUS.\n\n\nCHAP.",
    end: "THE PASTOR OF HERMAS.",
  },
];

export function parseApostolicFathers(raw: string): ParsedPrimaryWork[] {
  return APOSTOLIC_WORKS.map((definition) => {
    let body = bounded(raw, definition.start, definition.end);
    if (definition.id === "work:epistle-diognetus") body = `CHAP.${body}`;
    return {
      id: definition.id,
      title: definition.title,
      aliases: definition.aliases ?? [],
      language: "en",
      sourceId: "source:gutenberg:77576",
      units: chapterUnits(definition.id, body),
    };
  });
}

function paragraphUnits(workId: string, text: string): ParsedPrimaryUnit[] {
  const paragraphs = normalizeLines(text)
    .split(/\n\s*\n/)
    .map(cleanBody)
    .filter(Boolean);
  if (!paragraphs.length) throw new Error(`No text found for ${workId}.`);
  return paragraphs.map((body, index) => {
    const section = String(index + 1);
    return { id: stableUnitId(workId, section), sequence: index + 1, section, text: body };
  });
}

export function parseConfessionalDocuments(source30323: string, source24979: string): ParsedPrimaryWork[] {
  const documents = [
    {
      id: "work:apostles-creed",
      title: "Apostles' Creed",
      aliases: ["Credo dos Apóstolos", "Apostolic Creed"],
      sourceId: "source:gutenberg:30323",
      text: bounded(source30323, "Apostles’ Creed.", "The Symbol, Or Creed Of St. Athanasius."),
    },
    {
      id: "work:athanasian-creed",
      title: "Athanasian Creed",
      aliases: ["Credo Atanasiano", "Quicunque vult"],
      sourceId: "source:gutenberg:30323",
      text: bounded(source30323, "The Symbol, Or Creed Of St. Athanasius.", "The Nicene Creed."),
    },
    {
      id: "work:nicene-creed-325",
      title: "Creed of Nicaea (325)",
      aliases: ["Credo Niceno", "Nicene Creed 325"],
      sourceId: "source:gutenberg:24979",
      text: bounded(source24979, "We believe in one God, Father Almighty, maker of all things visible", "§ 64. The Beginnings"),
    },
    {
      id: "work:nicene-constantinopolitan-western",
      title: "Nicene-Constantinopolitan Creed — Western recension with filioque",
      aliases: ["Credo Niceno-Constantinopolitano", "Nicene Creed"],
      sourceId: "source:gutenberg:30323",
      text: bounded(source30323, "    Translation.\n\n", "This Creed was adopted at Constantinople"),
    },
    {
      id: "work:chalcedonian-definition",
      title: "Definition of Chalcedon (451)",
      aliases: ["Definição de Calcedônia", "Chalcedonian Definition"],
      sourceId: "source:gutenberg:24979",
      text: bounded(source24979, "The holy, great, and ecumenical synod", "(_d_) Council of Chalcedon"),
    },
  ];
  return documents.map((document) => ({
    id: document.id,
    title: document.title,
    aliases: document.aliases,
    language: "en",
    sourceId: document.sourceId,
    units: paragraphUnits(document.id, document.text),
  }));
}
