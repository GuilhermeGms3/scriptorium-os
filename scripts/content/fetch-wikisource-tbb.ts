import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import bibliaLivreManifest from "../../generated/corpora/biblia-livre/2025.1.0/manifest.json";

const API = "https://pt.wikisource.org/w/api.php";
const ROOT_TITLE = "Tradução Brasileira da Bíblia";
const OUTPUT = resolve(
  import.meta.dirname,
  "../../corpora/source/traducao-brasileira-wikisource/2026-09-16/pages.json",
);

try {
  const existing = await readFile(OUTPUT);
  const parsed = JSON.parse(existing.toString("utf8")) as {
    schemaVersion?: number;
    pages?: unknown[];
  };
  if (parsed.schemaVersion === 1 && parsed.pages?.length === 1189) {
    process.stdout.write(
      `${JSON.stringify({ output: OUTPUT, pages: parsed.pages.length, bytes: existing.byteLength, sha256: createHash("sha256").update(existing).digest("hex"), reused: true }, null, 2)}\n`,
    );
    process.exit(0);
  }
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const BOOK_TITLES: Record<string, string> = {
  genesis: "Gênesis",
  exodus: "Êxodo",
  leviticus: "Levítico",
  numbers: "Números",
  deuteronomy: "Deuteronômio",
  joshua: "Josué",
  judges: "Juízes",
  ruth: "Rute",
  "1-samuel": "I Samuel",
  "2-samuel": "II Samuel",
  "1-kings": "I Reis",
  "2-kings": "II Reis",
  "1-chronicles": "I Crônicas",
  "2-chronicles": "II Crônicas",
  ezra: "Esdras",
  nehemiah: "Neemias",
  esther: "Ester",
  job: "Jó",
  psalms: "Salmos",
  proverbs: "Provérbios",
  ecclesiastes: "Eclesiastes",
  "song-of-songs": "Cantares",
  isaiah: "Isaías",
  jeremiah: "Jeremias",
  lamentations: "Lamentações",
  ezekiel: "Ezequiel",
  daniel: "Daniel",
  hosea: "Oseias",
  joel: "Joel",
  amos: "Amós",
  obadiah: "Obadias",
  jonah: "Jonas",
  micah: "Miqueias",
  nahum: "Naum",
  habakkuk: "Habacuque",
  zephaniah: "Sofonias",
  haggai: "Ageu",
  zechariah: "Zacarias",
  malachi: "Malaquias",
  matthew: "Mateus",
  mark: "Marcos",
  luke: "Lucas",
  john: "João",
  acts: "Atos",
  romans: "Romanos",
  "1-corinthians": "I Coríntios",
  "2-corinthians": "II Coríntios",
  galatians: "Gálatas",
  ephesians: "Efésios",
  philippians: "Filipenses",
  colossians: "Colossenses",
  "1-thessalonians": "I Tessalonicenses",
  "2-thessalonians": "II Tessalonicenses",
  "1-timothy": "I Timóteo",
  "2-timothy": "II Timóteo",
  titus: "Tito",
  philemon: "Filemom",
  hebrews: "Hebreus",
  james: "Tiago",
  "1-peter": "I Pedro",
  "2-peter": "II Pedro",
  "1-john": "I João",
  "2-john": "II João",
  "3-john": "III João",
  jude: "Judas",
  revelation: "Apocalipse",
};

function roman(value: number): string {
  const numerals: [number, string][] = [
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let rest = value;
  let result = "";
  for (const [amount, symbol] of numerals) {
    while (rest >= amount) {
      result += symbol;
      rest -= amount;
    }
  }
  return result;
}

type Page = {
  pageid?: number;
  title: string;
  missing?: boolean;
  revisions?: { revid: number; timestamp: string; slots: { main: { content: string } } }[];
};

type RequestedPage = { bookId: string; chapter: number; title: string };

async function fetchBatch(batch: RequestedPage[], attempt = 0): Promise<Page[]> {
  const url = new URL(API);
  url.search = new URLSearchParams({
    action: "query",
    prop: "revisions",
    rvprop: "ids|timestamp|content",
    rvslots: "main",
    titles: batch.map((item) => item.title).join("|"),
    format: "json",
    formatversion: "2",
    origin: "*",
  }).toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Scriptorium/0.1 corpus-acquisition (local research tool)" },
    });
    if (response.status === 429 && attempt < 6) {
      const retryAfter = Number(response.headers.get("retry-after"));
      const waitMs = Number.isFinite(retryAfter)
        ? Math.max(1_000, retryAfter * 1_000)
        : 2_000 * 2 ** attempt;
      await new Promise((resolvePromise) => setTimeout(resolvePromise, waitMs));
      return fetchBatch(batch, attempt + 1);
    }
    if (!response.ok) throw new Error(`Wikisource API returned HTTP ${response.status}.`);
    const payload = (await response.json()) as { query?: { pages?: Page[] }; error?: unknown };
    if (!payload.query?.pages)
      throw new Error(`Unexpected Wikisource response: ${JSON.stringify(payload.error)}`);
    return payload.query.pages;
  } finally {
    clearTimeout(timeout);
  }
}

const requested: RequestedPage[] = [];
for (const book of bibliaLivreManifest.books) {
  const sourceTitle = BOOK_TITLES[book.id];
  if (!sourceTitle) throw new Error(`No Wikisource mapping for canonical book ${book.id}.`);
  for (let chapter = 1; chapter <= book.chapters; chapter += 1) {
    requested.push({
      bookId: book.id,
      chapter,
      title:
        book.chapters === 1
          ? `${ROOT_TITLE}/${sourceTitle}`
          : `${ROOT_TITLE}/${sourceTitle}/${roman(chapter)}`,
    });
  }
}

const received = new Map<string, Page>();
for (let offset = 0; offset < requested.length; offset += 40) {
  for (const page of await fetchBatch(requested.slice(offset, offset + 40))) {
    received.set(page.title, page);
  }
  process.stdout.write(
    `\rWikisource: ${Math.min(offset + 40, requested.length)}/${requested.length}`,
  );
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 350));
}
process.stdout.write("\n");

const pages = requested.map((item) => {
  const page = received.get(item.title);
  const revision = page?.revisions?.[0];
  if (!page || page.missing || !page.pageid || !revision?.slots.main.content) {
    throw new Error(`Missing or empty Wikisource chapter: ${item.title}.`);
  }
  return {
    canonicalBookId: item.bookId,
    chapter: item.chapter,
    title: item.title,
    pageId: page.pageid,
    revisionId: revision.revid,
    revisionTimestamp: revision.timestamp,
    content: revision.slots.main.content.normalize("NFC"),
  };
});

const snapshot = {
  schemaVersion: 1,
  source: {
    title: ROOT_TITLE,
    url: "https://pt.wikisource.org/wiki/Tradu%C3%A7%C3%A3o_Brasileira_da_B%C3%ADblia",
    api: API,
    originalPublicationYear: 1917,
    rights:
      "Redistribuição bloqueada: a hospedagem do Wikisource segue a lei dos EUA e o status no Brasil não está esclarecido.",
    warning:
      "Corpus em quarentena técnica; não integrar a pacotes públicos sem revisão jurídica documentada.",
  },
  retrievedAt: new Date().toISOString(),
  pages,
};
const serialized = `${JSON.stringify(snapshot, null, 2)}\n`;
await mkdir(resolve(OUTPUT, ".."), { recursive: true });
await writeFile(OUTPUT, serialized, "utf8");
process.stdout.write(
  `${JSON.stringify({ output: OUTPUT, pages: pages.length, bytes: Buffer.byteLength(serialized), sha256: createHash("sha256").update(serialized).digest("hex") }, null, 2)}\n`,
);
