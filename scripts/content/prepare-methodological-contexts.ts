import { DatabaseSync } from "node:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { ContextualReadingPackageSchema } from "../../src/lib/domain/contextual-reading";
import { DEFAULT_BIBLICAL_VERSIFICATION } from "../../src/lib/domain/text-identity";

// Operator-selected analytical paragraphs, not a rule that every mention explains a verse.
// Only short locators enter Git; protected evidence is read from the installed private source.
const checksum = "74684b5e9334d9864dc22d5c1d34310f649716858c9a828c949933f322384424";
const selections = [
  {
    page: 45,
    start: "Esses dados permitem",
    end: "Para corroborar",
    book: "acts",
    chapter: 16,
    first: 13,
    last: 13,
    title: "A interpretação de proseuché em Atos 16:13",
    rationale:
      "O parágrafo argumenta explicitamente sobre Atos 16:13 e a identificação do espaço de reunião. A conclusão é dos autores, não um consenso imposto pelo sistema.",
  },
  {
    page: 46,
    start: "A junção desses verbos",
    end: "Os comentários que aludem",
    book: "acts",
    chapter: 16,
    first: 13,
    last: 15,
    title: "Mulheres e reunião religiosa em Filipos",
    rationale:
      "Análise dos verbos e da composição do grupo na perícope de Atos 16:13–15. O trecho contrapõe posições interpretativas e não deve ser reduzido a definição lexical universal.",
  },
  {
    page: 47,
    start: "Reunidas nesse espaço",
    end: "Aqui investigamos",
    book: "acts",
    chapter: 16,
    first: 14,
    last: 14,
    title: "Lídia e a expressão temente a Deus",
    rationale:
      "O trecho identifica expressamente Atos 16:14 e propõe uma interpretação histórico-social da personagem e de seu grupo. As demais passagens mencionadas são comparações, não destinos primários.",
  },
  {
    page: 60,
    start: "Na tradição religiosa",
    end: "Trata-se",
    book: "exodus",
    chapter: 20,
    first: 4,
    last: 6,
    title: "Imagens e aniconismo na interpretação do mandamento",
    rationale:
      "O título do capítulo delimita Êxodo 20:4–6 e Deuteronômio 5:8–10; o parágrafo desenvolve a leitura dos autores sobre imagens e diversidade das tradições, sem decidir as divergências confessionais.",
    additional: [
      {
        bookId: "deuteronomy",
        chapter: 5,
        verseStart: 8,
        verseEnd: 10,
        versificationSchemeId: DEFAULT_BIBLICAL_VERSIFICATION,
      },
    ],
  },
  {
    page: 61,
    start: "Nessa disposição paralela",
    end: "Na versão de Deuteronômio",
    book: "exodus",
    chapter: 20,
    first: 8,
    last: 11,
    title: "Lembrar e guardar nas versões do mandamento sabático",
    rationale:
      "O parágrafo compara explicitamente Êxodo 20:8–11 com Deuteronômio 5:12 e analisa os verbos hebraicos e a justificativa criacional. O alcance comparativo permanece separado da perícope sobre imagens.",
    additional: [
      {
        bookId: "deuteronomy",
        chapter: 5,
        verseStart: 12,
        verseEnd: 12,
        versificationSchemeId: DEFAULT_BIBLICAL_VERSIFICATION,
      },
    ],
  },
] as const;
const [workspace, output] = process.argv.slice(2);
if (!workspace || !output)
  throw Error("Uso: prepare-methodological-contexts <workspace.sqlite3> <diretório privado novo>");
const db = new DatabaseSync(resolve(workspace), { readOnly: true });
try {
  const document = db.prepare("SELECT id FROM private_documents WHERE checksum=?").get(checksum);
  if (!document) throw Error("Edição selecionada não instalada.");
  const notes = selections.map((item) => {
    const row = db
      .prepare("SELECT text FROM private_document_pages WHERE document_id=? AND page_index=?")
      .get(document["id"]!, item.page - 1);
    if (!row) throw Error("Página ausente.");
    const text = String(row["text"]);
    const start = text.indexOf(item.start);
    const end = text.indexOf(item.end, start + item.start.length);
    if (start < 0 || end <= start || text.indexOf(item.start, start + 1) >= 0)
      throw Error("Delimitadores ausentes ou ambíguos; revisão necessária.");
    const quote = text.slice(start, end).trim();
    return {
      sourceChecksum: checksum,
      fragments: [{ physicalPage: item.page, quote }],
      rawReference: `${item.book} ${item.chapter}:${item.first}-${item.last}`,
      passage: {
        bookId: item.book,
        chapter: item.chapter,
        verseStart: item.first,
        verseEnd: item.last,
        versificationSchemeId: DEFAULT_BIBLICAL_VERSIFICATION,
      },
      additionalPassages: "additional" in item ? item.additional : [],
      relationScope: item.first === item.last ? "verse" : "range",
      domains: ["exegesis", "hermeneutics"],
      analysis: {
        title: item.title,
        summary: quote,
        mode: "source-excerpt",
        contentType: "exegetical-note",
        rationale: item.rationale,
        sourceContext: {
          kind: "methodological-study",
          locator: `Exegese e hermenêutica · p. física ${item.page}`,
          sectionPath: ["Estudo exegético e hermenêutico", item.title],
          authorLabel: "Ivoni Richter Reimer e Haroldo Reimer",
          traditionLabel: "Abordagens histórico-críticas e hermenêuticas dos autores",
        },
        limitations: [
          "Seleção contextual assistida; não é aprovação acadêmica ou posição universal do Scriptorium.",
          "Citações secundárias permanecem no texto; hipóteses históricas e interpretações são atribuídas aos autores.",
        ],
      },
    };
  });
  const batch = ContextualReadingPackageSchema.parse({
    format: "scriptorium-contextual-reading-v1",
    batchId: "methodological-exegesis-20261022",
    analyst: "operator-selected-methodological-contexts",
    createdAt: new Date().toISOString(),
    coverage:
      "Cinco parágrafos analíticos selecionados em Atos e no Decálogo; não cobertura integral da obra.",
    notes,
  });
  const raw = JSON.stringify(batch, null, 2);
  const destination = resolve(output);
  mkdirSync(destination);
  writeFileSync(join(destination, "0000-methodological-contexts.json"), raw, {
    flag: "wx",
    mode: 0o600,
  });
  writeFileSync(
    join(destination, "report.json"),
    JSON.stringify({
      format: "scriptorium-commentary-report-v1",
      sourceType: "source-context",
      structureResolved: true,
      sourceChecksum: checksum,
      files: [
        {
          file: "0000-methodological-contexts.json",
          sha256: createHash("sha256").update(raw).digest("hex"),
        },
      ],
    }),
    { flag: "wx", mode: 0o600 },
  );
  console.info(JSON.stringify({ notes: notes.length, destination }));
} finally {
  db.close();
}
