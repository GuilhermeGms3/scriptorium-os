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

function gutenbergBody(raw: string): string {
  const normalized = normalizeLines(raw);
  const start = normalized.search(/^\*\*\* START OF THE PROJECT GUTENBERG EBOOK .+ \*\*\*$/m);
  const end = normalized.search(/^\*\*\* END OF THE PROJECT GUTENBERG EBOOK .+ \*\*\*$/m);
  if (start < 0 || end <= start)
    throw new Error("Project Gutenberg text boundaries were not found.");
  return normalized.slice(normalized.indexOf("\n", start) + 1, end);
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
    new RegExp(
      marker
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\s+/g, "\\s+"),
      "i",
    );
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
  if (matches.length !== 16)
    throw new Error(`Didache expected 16 chapters; found ${matches.length}.`);
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

function origenBookUnits(workId: string, book: string, raw: string): ParsedPrimaryUnit[] {
  const normalized = normalizeLines(raw)
    .replace(/^\s*ORIGEN'S\s+COMMENTARY\s+ON\s+JOHN\.\s*$/gim, "")
    .replace(/^\s*\d{3}\s*$/gm, "");
  const matches = [...normalized.matchAll(/^\s*(I|\d+)\.\s+(?=\S)/gm)];
  if (matches.length < 2) throw new Error(`No structural sections found for Origen book ${book}.`);
  return matches.map((match, index) => {
    const chapter = match[1] === "I" ? "1" : match[1]!;
    const section = `${book}.${chapter}`;
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? normalized.length;
    const text = cleanBody(normalized.slice(start, end));
    if (!text) throw new Error(`Empty Origen section ${section}.`);
    const firstSentence = text.match(/^(.{1,180}?)(?:\.\s|$)/)?.[1]?.trim();
    return {
      id: stableUnitId(workId, section),
      sequence: index + 1,
      section,
      ...(firstSentence ? { title: firstSentence } : {}),
      text,
    };
  });
}

export function parseOrigenCommentaryOnJohn(raw: string): ParsedPrimaryWork {
  const normalized = normalizeLines(raw);
  const commentaryStart = normalized.indexOf(
    "ORIGEN'S  COMMENTARY  ON  THE  GOSPEL  OF  JOHN.",
    20_000,
  );
  const bookTwoStart = normalized.indexOf("BOOK   II.", commentaryStart);
  const fragmentsStart = normalized.indexOf("FRAGMENTS  OF  THE  FOURTH  BOOK.", bookTwoStart);
  if (commentaryStart < 0 || bookTwoStart < 0 || fragmentsStart < 0)
    throw new Error("Origen Commentary on John Books I-II boundaries were not found.");
  const bookOneStart = normalized.indexOf("BOOK  I.", commentaryStart);
  if (bookOneStart < 0 || bookOneStart >= bookTwoStart)
    throw new Error("Origen Commentary on John Book I boundary was not found.");
  const workId = "work:origen-commentary-john-books-1-2";
  const units = [
    ...origenBookUnits(
      workId,
      "I",
      normalized.slice(bookOneStart + "BOOK  I.".length, bookTwoStart),
    ),
    ...origenBookUnits(
      workId,
      "II",
      normalized.slice(bookTwoStart + "BOOK   II.".length, fragmentsStart),
    ),
  ].map((unit, index) => ({ ...unit, sequence: index + 1 }));
  return {
    id: workId,
    title: "Origen's Commentary on the Gospel of John — Books I and II",
    aliases: [
      "Origen on John",
      "Comentário de Orígenes sobre o Evangelho de João",
      "Commentary on John Books I-II",
    ],
    language: "en",
    sourceId: "source:internet-archive:cu31924029220535",
    units,
  };
}

export function parseCopticGospelOfThomas(raw: string): ParsedPrimaryWork {
  const divisions = [...raw.matchAll(/<div1\s+n="([^"]+)">([\s\S]*?)<\/div1>/g)];
  if (divisions.length !== 116)
    throw new Error(
      `Coptic Gospel of Thomas expected prologue, 114 sayings and colophon; found ${divisions.length}.`,
    );
  const workId = "work:gospel-thomas-coptic";
  const units = divisions.map((division, index) => {
    const section =
      division[1] === "0" ? "Prólogo" : division[1] === "subtitle" ? "Colofão" : division[1]!;
    const tokens = [...division[2]!.matchAll(/<w(?:\s[^>]*)?>([\s\S]*?)<\/w>/g)].map((word) =>
      word[1]!
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, "")
        .trim(),
    );
    const text = tokens
      .filter(Boolean)
      .join(" ")
      .replace(/\s+([·.,;:!?])/g, "$1")
      .normalize("NFC");
    if (!text) throw new Error(`Empty Coptic Gospel of Thomas unit ${section}.`);
    return {
      id: stableUnitId(workId, section),
      sequence: index + 1,
      section,
      title: section === "Prólogo" || section === "Colofão" ? section : `Dito ${section}`,
      text,
    };
  });
  return {
    id: workId,
    title: "Gospel of Thomas — Coptic text",
    aliases: ["Evangelho de Tomé", "Gospel of Thomas", "NH II,2", "NHC II,2"],
    language: "cop",
    sourceId: "source:coptic-scriptorium:thomas",
    units,
  };
}

export function parseAugustineConfessions(raw: string): ParsedPrimaryWork {
  const body = gutenbergBody(raw);
  const books = [...body.matchAll(/^BOOK\s+([IVXLCDM]+)\s*$/gm)];
  if (books.length !== 13)
    throw new Error(`Augustine Confessions expected 13 books; found ${books.length}.`);
  const workId = "work:augustine-confessions";
  const units: ParsedPrimaryUnit[] = books.map((book, bookIndex) => {
    const bookRoman = book[1]!;
    const start = (book.index ?? 0) + book[0].length;
    const end = books[bookIndex + 1]?.index ?? body.length;
    const text = cleanBody(body.slice(start, end));
    if (!text) throw new Error(`Empty Augustine Confessions book ${bookRoman}.`);
    return {
      id: stableUnitId(workId, bookRoman),
      sequence: bookIndex + 1,
      section: bookRoman,
      title: `Livro ${bookRoman}`,
      text,
    };
  });
  return {
    id: workId,
    title: "The Confessions of Saint Augustine",
    aliases: ["Confissões de Santo Agostinho", "Confessions", "Confessiones"],
    language: "en",
    sourceId: "source:gutenberg:3296",
    units,
  };
}

export function parseAquinasSummaPart(
  raw: string,
  part: "prima-pars" | "prima-secundae" | "secunda-secundae" | "tertia-pars",
  sourceId: string,
): ParsedPrimaryWork {
  const body = gutenbergBody(raw);
  const articles = [
    ...body.matchAll(/^([A-Z][A-Z -]+ ARTICLE)\s+\[([^\]]+)\]\s*\n+([^\n]+)\s*$/gm),
  ];
  if (articles.length < 300)
    throw new Error(`Aquinas ${part} expected at least 300 articles; found ${articles.length}.`);
  const labels: Record<typeof part, { title: string; portuguese: string }> = {
    "prima-pars": {
      title: "Summa Theologica — Prima Pars",
      portuguese: "Suma Teológica — Primeira Parte",
    },
    "prima-secundae": {
      title: "Summa Theologica — Prima Secundae",
      portuguese: "Suma Teológica — Primeira Parte da Segunda Parte",
    },
    "secunda-secundae": {
      title: "Summa Theologica — Secunda Secundae",
      portuguese: "Suma Teológica — Segunda Parte da Segunda Parte",
    },
    "tertia-pars": {
      title: "Summa Theologica — Tertia Pars",
      portuguese: "Suma Teológica — Terceira Parte",
    },
  };
  const workId = `work:aquinas-summa-${part}`;
  const units = articles.map((article, index) => {
    const section = article[2]!.replace(/\s+/g, " ").trim();
    const title = cleanBody(article[3]!);
    const start = (article.index ?? 0) + article[0].length;
    const end = articles[index + 1]?.index ?? body.length;
    const text = cleanBody(`${article[3]}\n\n${body.slice(start, end)}`);
    if (!text) throw new Error(`Empty Aquinas article ${section}.`);
    return {
      // Several Gutenberg files repeat an article locator with a different heading.
      // Preserve the printed locator and include the heading only in stable identity.
      id: stableUnitId(workId, `${section}:${title}`),
      sequence: index + 1,
      section,
      title,
      text,
    };
  });
  return {
    id: workId,
    title: labels[part].title,
    aliases: [labels[part].portuguese, "Summa Theologiae", "Suma Teológica"],
    language: "en",
    sourceId,
    units,
  };
}

export function parseConfessionalDocuments(
  source30323: string,
  source24979: string,
): ParsedPrimaryWork[] {
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
      text: bounded(
        source24979,
        "We believe in one God, Father Almighty, maker of all things visible",
        "§ 64. The Beginnings",
      ),
    },
    {
      id: "work:nicene-constantinopolitan-western",
      title: "Nicene-Constantinopolitan Creed — Western recension with filioque",
      aliases: ["Credo Niceno-Constantinopolitano", "Nicene Creed"],
      sourceId: "source:gutenberg:30323",
      text: bounded(
        source30323,
        "    Translation.\n\n",
        "This Creed was adopted at Constantinople",
      ),
    },
    {
      id: "work:chalcedonian-definition",
      title: "Definition of Chalcedon (451)",
      aliases: ["Definição de Calcedônia", "Chalcedonian Definition"],
      sourceId: "source:gutenberg:24979",
      text: bounded(
        source24979,
        "The holy, great, and ecumenical synod",
        "(_d_) Council of Chalcedon",
      ),
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
