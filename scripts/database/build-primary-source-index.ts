import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { CorpusPackageManifestSchema, type CorpusPackageManifest } from "../../src/lib/corpus-runtime/contracts";
import { buildSearchNormalization } from "../../src/lib/corpus-runtime/search-normalization";
import { applyMigrations, DATABASE_SCHEMA_VERSION } from "./migrate";
import {
  parseApostolicFathers,
  parseConfessionalDocuments,
  parseDidache,
  type ParsedPrimaryWork,
} from "../content/primary-source-parser";

const root = resolve(import.meta.dirname, "../..");
const outputDirectory = join(root, "public/corpus-packages");
const migrationsDirectory = join(root, "src/lib/corpus-runtime/migrations");
const schemeId = "scriptorium-document-locator-1";

const sha256 = (value: Uint8Array | string): string =>
  createHash("sha256").update(value).digest("hex");

interface SourceDefinition {
  id: string;
  title: string;
  path: string;
  url: string;
  checksum: string;
  sizeBytes: number;
  edition: string;
  editor?: string;
  translators: string[];
  language: string;
  retrievalDate: string;
  license: string;
  redistributionStatus: "allowed";
  attribution: string;
}

const sources: SourceDefinition[] = [
  {
    id: "source:gutenberg:42053",
    title: "The Didache; or, The Teaching of the Twelve Apostles",
    path: "corpora/source/primary-sources/gutenberg-42053/pg42053.txt",
    url: "https://www.gutenberg.org/cache/epub/42053/pg42053.txt",
    checksum: "2a8f41c51db5286e686f0d520c5c5d272a49e9ad940c0d99ee216e8eb89a0550",
    sizeBytes: 80_019,
    edition: "New York: Charles Scribner's Sons, 1884",
    editor: "Francis Brown",
    translators: ["Francis Brown", "Roswell D. Hitchcock"],
    language: "en",
    retrievalDate: "2026-09-16",
    license: "Public domain in the United States; source edition authors died before 1956",
    redistributionStatus: "allowed",
    attribution: "Project Gutenberg eBook 42053; Brown and Hitchcock edition (1884).",
  },
  {
    id: "source:gutenberg:77576",
    title: "The Writings of the Apostolic Fathers",
    path: "corpora/source/primary-sources/gutenberg-77576/pg77576.txt",
    url: "https://www.gutenberg.org/cache/epub/77576/pg77576.txt",
    checksum: "2a50a9cb4e98ab58a01fc6e11df700a9ab685b638d52be954fc0a7467eb598cb",
    sizeBytes: 965_733,
    edition: "Edinburgh: T. & T. Clark, 1870",
    translators: ["Alexander Roberts", "James Donaldson", "F. Crombie"],
    language: "en",
    retrievalDate: "2026-09-16",
    license: "Public domain in the United States; source edition translators died before 1956",
    redistributionStatus: "allowed",
    attribution: "Project Gutenberg eBook 77576; Roberts, Donaldson, and Crombie translation (1870).",
  },
  {
    id: "source:gutenberg:30323",
    title: "The Book of Religions",
    path: "corpora/source/primary-sources/gutenberg-30323/pg30323.txt",
    url: "https://www.gutenberg.org/cache/epub/30323/pg30323.txt",
    checksum: "743cd1d424945c3be359532062ae033a2fedaf6ac7707d2959a15bf35e0fe575",
    sizeBytes: 913_253,
    edition: "John Hayward, new and improved edition, 1881",
    editor: "John Hayward",
    translators: [],
    language: "en",
    retrievalDate: "2026-09-16",
    license: "Public domain in the United States",
    redistributionStatus: "allowed",
    attribution: "Project Gutenberg eBook 30323; historical 1881 source edition.",
  },
  {
    id: "source:gutenberg:24979",
    title: "A Source Book for Ancient Church History",
    path: "corpora/source/primary-sources/gutenberg-24979/pg24979.txt",
    url: "https://www.gutenberg.org/cache/epub/24979/pg24979.txt",
    checksum: "3e4362c7d4162410a6d10630baf12096e0e56c8266e87adbc0d077703e8c52cd",
    sizeBytes: 1_524_820,
    edition: "Joseph Cullen Ayer, Jr., New York, 1913",
    editor: "Joseph Cullen Ayer, Jr.",
    translators: [],
    language: "en",
    retrievalDate: "2026-09-16",
    license: "Public domain in the United States",
    redistributionStatus: "allowed",
    attribution: "Project Gutenberg eBook 24979; Ayer source book (1913).",
  },
];

function verifiedSource(source: SourceDefinition): string {
  const absolute = join(root, source.path);
  const bytes = readFileSync(absolute);
  if (bytes.byteLength !== source.sizeBytes || sha256(bytes) !== source.checksum)
    throw new Error(`Source custody check failed for ${source.id}.`);
  return bytes.toString("utf8");
}

function buildShard(sourcePath: string, editionId: string, workId?: string): CorpusPackageManifest["parts"][number] {
  const fileName = workId ? `${workId.replace(/^work:/, "")}.sqlite3` : "search.sqlite3";
  const directory = join(outputDirectory, editionId);
  const path = join(directory, fileName);
  mkdirSync(directory, { recursive: true });
  if (existsSync(path)) rmSync(path);
  const database = new DatabaseSync(path);
  applyMigrations(database, migrationsDirectory, { appliedAt: "1970-01-01T00:00:00.000Z" });
  database.prepare("ATTACH DATABASE ? AS source_db").run(sourcePath);
  database.exec("PRAGMA foreign_keys=OFF; BEGIN IMMEDIATE;");
  try {
    database.exec(`
      INSERT INTO corpora SELECT * FROM source_db.corpora;
      INSERT INTO corpus_editions SELECT * FROM source_db.corpus_editions;
      INSERT INTO sources SELECT * FROM source_db.sources;
      INSERT INTO corpus_sources SELECT * FROM source_db.corpus_sources;
      INSERT INTO versification_schemes SELECT * FROM source_db.versification_schemes;
    `);
    if (workId) {
      database.prepare("INSERT INTO works SELECT * FROM source_db.works WHERE id=?").run(workId);
      database.prepare("INSERT INTO text_units SELECT * FROM source_db.text_units WHERE work_id=?").run(workId);
      database.exec("INSERT INTO text_addresses SELECT a.* FROM source_db.text_addresses a JOIN text_units u ON u.id=a.text_unit_id;");
      database.prepare("INSERT INTO text_units_fts SELECT * FROM source_db.text_units_fts WHERE work_id=?").run(workId);
    } else {
      database.exec(`
        INSERT INTO works SELECT * FROM source_db.works;
        INSERT INTO text_units SELECT * FROM source_db.text_units;
        INSERT INTO text_addresses SELECT * FROM source_db.text_addresses;
        INSERT INTO text_units_fts SELECT * FROM source_db.text_units_fts;
        INSERT INTO search_documents(rowid,text_unit_id) SELECT rowid,text_unit_id FROM source_db.text_units_fts;
      `);
    }
    database.exec("COMMIT; PRAGMA foreign_keys=ON;");
  } catch (error) {
    database.exec("ROLLBACK");
    database.close();
    throw error;
  }
  const violations = database.prepare("PRAGMA foreign_key_check").all();
  if (violations.length) throw new Error(`${fileName} contains ${violations.length} FK violations.`);
  database.exec("INSERT INTO text_units_fts(text_units_fts) VALUES('optimize'); VACUUM;");
  database.close();
  const bytes = readFileSync(path);
  return {
    id: `${editionId}:${workId ?? "search"}`,
    ...(workId ? { workId } : {}),
    role: workId ? "content" : "search",
    databasePath: `/corpus-packages/${editionId}/${fileName}`,
    checksum: sha256(bytes),
    sizeBytes: bytes.byteLength,
  };
}

function buildPackage(input: {
  corpusId: string;
  editionId: string;
  title: string;
  abbreviation: string;
  version: string;
  works: ParsedPrimaryWork[];
  sourceIds: string[];
}, buildFingerprint: string): CorpusPackageManifest {
  const outputPath = join(outputDirectory, `${input.editionId}.sqlite3`);
  mkdirSync(outputDirectory, { recursive: true });
  if (existsSync(outputPath)) rmSync(outputPath);
  const database = new DatabaseSync(outputPath);
  applyMigrations(database, migrationsDirectory, { appliedAt: "1970-01-01T00:00:00.000Z" });
  const sourceChecksum = sha256(input.sourceIds.map((id) => sources.find((source) => source.id === id)!.checksum).join(":"));
  database.exec("BEGIN IMMEDIATE");
  try {
    database.prepare("INSERT INTO corpora(id,name,kind,rights_json,provenance_json) VALUES(?,?,?,?,?)").run(
      input.corpusId,
      input.title,
      "primary-source-collection",
      JSON.stringify({ license: "Public domain source editions", redistribution: "allowed" }),
      JSON.stringify({ sourceIds: input.sourceIds, reviewStatus: "source-imported" }),
    );
    database.prepare("INSERT INTO corpus_editions(id,corpus_id,title,abbreviation,language,script,direction,edition_kind,version,package_id,package_checksum) VALUES(?,?,?,?,?,?,?,?,?,?,?)").run(
      input.editionId,
      input.corpusId,
      input.title,
      input.abbreviation,
      "en",
      "Latn",
      "ltr",
      "historical-translation",
      input.version,
      `package:${input.editionId}`,
      sourceChecksum,
    );
    database.prepare("INSERT INTO versification_schemes(id,name,description,version) VALUES(?,?,?,?)").run(
      schemeId,
      "Scriptorium document locator",
      "Work/section locator for non-biblical documents; not a biblical versification.",
      "1",
    );
    for (const sourceId of input.sourceIds) {
      const source = sources.find((candidate) => candidate.id === sourceId)!;
      database.prepare("INSERT INTO sources(id,source_type,title,locator,checksum,metadata_json) VALUES(?,?,?,?,?,?)").run(
        source.id,
        "primary-source-edition",
        source.title,
        source.url,
        source.checksum,
        JSON.stringify({
          edition: source.edition,
          editor: source.editor,
          translators: source.translators,
          language: source.language,
          retrievalDate: source.retrievalDate,
          license: source.license,
          redistributionStatus: source.redistributionStatus,
          attribution: source.attribution,
          transformationHistory: ["verify-sha256", "extract-work-boundaries", "normalize-nfc", "split-structural-units", "index-fts5"],
          reviewStatus: "source-imported",
        }),
      );
      database.prepare("INSERT INTO corpus_sources(corpus_id,source_id,role) VALUES(?,?,?)").run(input.corpusId, source.id, "text-source");
    }
    const insertWork = database.prepare("INSERT INTO works(id,corpus_id,title,work_kind,sequence) VALUES(?,?,?,?,?)");
    const insertUnit = database.prepare("INSERT INTO text_units(id,corpus_id,edition_id,work_id,versification_scheme_id,sequence,unit_type,surface_text,normalized_search_text,provenance_json) VALUES(?,?,?,?,?,?,?,?,?,?)");
    const insertAddress = database.prepare("INSERT INTO text_addresses(text_unit_id,versification_scheme_id,section_label,display_address) VALUES(?,?,?,?)");
    const insertFts = database.prepare("INSERT INTO text_units_fts(text_unit_id,edition_id,work_id,language,title,surface_text,normalized_search_text,lemma_text,morphology_text) VALUES(?,?,?,?,?,?,?,?,?)");
    input.works.forEach((work, workIndex) => {
      insertWork.run(work.id, input.corpusId, work.title, "ancient-document", workIndex + 1);
      work.units.forEach((unit) => {
        const display = `${work.title} ${unit.section}`;
        const provenance = JSON.stringify({
          sourceId: work.sourceId,
          sourceChecksum: sources.find((source) => source.id === work.sourceId)!.checksum,
          locator: unit.section,
          transformations: ["normalize-nfc", "unwrap-lines", "separate-editorial-notes"],
          reviewStatus: "source-imported",
        });
        const normalized = buildSearchNormalization(unit.text, work.language);
        insertUnit.run(unit.id, input.corpusId, input.editionId, work.id, schemeId, unit.sequence, "section", unit.text, normalized, provenance);
        insertAddress.run(unit.id, schemeId, unit.section, display);
        insertFts.run(unit.id, input.editionId, work.id, work.language, [work.title, ...work.aliases, unit.title ?? ""].join(" "), unit.text, normalized, "", "");
      });
    });
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    database.close();
    throw error;
  }
  database.exec("INSERT INTO search_documents(rowid,text_unit_id) SELECT rowid,text_unit_id FROM text_units_fts; INSERT INTO text_units_fts(text_units_fts) VALUES('optimize'); VACUUM;");
  const violations = database.prepare("PRAGMA foreign_key_check").all();
  const quick = database.prepare("PRAGMA quick_check").get() as Record<string, unknown>;
  database.close();
  if (violations.length || Object.values(quick)[0] !== "ok") throw new Error(`Invalid primary-source database ${input.editionId}.`);
  const bytes = readFileSync(outputPath);
  const parts = input.works.map((work) => buildShard(outputPath, input.editionId, work.id));
  parts.push(buildShard(outputPath, input.editionId));
  return CorpusPackageManifestSchema.parse({
    schemaVersion: DATABASE_SCHEMA_VERSION,
    id: `runtime:package:${input.editionId}`,
    corpusId: input.corpusId,
    editionId: input.editionId,
    version: input.version,
    title: input.title,
    abbreviation: input.abbreviation,
    works: input.works.map((work) => work.id),
    languages: ["en"],
    databasePath: `/corpus-packages/${input.editionId}.sqlite3`,
    checksum: sha256(bytes),
    sourceChecksum,
    buildFingerprint,
    sizeBytes: statSync(outputPath).size,
    downloadSizeBytes: parts.reduce((total, part) => total + part.sizeBytes, 0),
    storageSizeBytes: parts.reduce((total, part) => total + part.sizeBytes, 0),
    deliveryMode: "work-shards",
    sourceLocation: `/corpus-packages/${input.editionId}.sqlite3`,
    dependencies: [`schema:${DATABASE_SCHEMA_VERSION}`, "parser:primary-sources:1.0.0", ...input.sourceIds],
    parts,
    versificationSchemeId: schemeId,
    rights: {
      license: "Public domain source editions",
      redistribution: "allowed",
      attribution: input.sourceIds.map((id) => sources.find((source) => source.id === id)!.attribution).join(" "),
    },
    provenance: {
      packageId: `package:${input.editionId}`,
      datasetId: `dataset:${input.editionId}`,
      sourceArtifactIds: input.sourceIds,
      transformationIds: ["transformation:primary-source-structural-import:1"],
    },
  });
}

function cachedPackageValid(manifest: CorpusPackageManifest, fingerprint: string): boolean {
  if (manifest.buildFingerprint !== fingerprint || manifest.schemaVersion !== DATABASE_SCHEMA_VERSION)
    return false;
  return [
    { path: manifest.databasePath, checksum: manifest.checksum },
    ...manifest.parts.map((part) => ({ path: part.databasePath, checksum: part.checksum })),
  ].every((file) => {
    const path = join(root, "public", file.path.replace(/^\//, ""));
    return existsSync(path) && sha256(readFileSync(path)) === file.checksum;
  });
}

export function buildPrimarySourcePackages(
  previousPackages: CorpusPackageManifest[] = [],
  report: { editionId: string; action: "reused" | "rebuilt" }[] = [],
): CorpusPackageManifest[] {
  const source42053 = verifiedSource(sources[0]!);
  const source77576 = verifiedSource(sources[1]!);
  const source30323 = verifiedSource(sources[2]!);
  const source24979 = verifiedSource(sources[3]!);
  const apostolicWorks = [parseDidache(source42053), ...parseApostolicFathers(source77576)];
  const confessionalWorks = parseConfessionalDocuments(source30323, source24979);
  const definitions = [
    {
      corpusId: "apostolic-fathers-public-domain",
      editionId: "apostolic-fathers-pd-en-1",
      title: "Apostolic Fathers — public-domain English editions",
      abbreviation: "AF-PD-EN",
      version: "1870+1884-r1",
      works: apostolicWorks,
      sourceIds: [sources[0]!.id, sources[1]!.id],
    },
    {
      corpusId: "historic-creeds-public-domain",
      editionId: "historic-creeds-pd-en-1",
      title: "Historic Creeds and Conciliar Documents — public-domain English editions",
      abbreviation: "CREEDS-PD-EN",
      version: "1881+1913-r1",
      works: confessionalWorks,
      sourceIds: [sources[2]!.id, sources[3]!.id],
    },
  ];
  return definitions.map((definition) => {
    const fingerprint = sha256(JSON.stringify({
      schemaVersion: DATABASE_SCHEMA_VERSION,
      parserVersion: "primary-sources-1.0.0",
      editionId: definition.editionId,
      sourceChecksums: definition.sourceIds.map((id) => sources.find((source) => source.id === id)!.checksum),
      workShape: definition.works.map((work) => [work.id, work.units.length, sha256(work.units.map((unit) => unit.text).join("\n"))]),
    }));
    const previous = previousPackages.find((manifest) => manifest.editionId === definition.editionId);
    if (previous && cachedPackageValid(previous, fingerprint)) {
      report.push({ editionId: definition.editionId, action: "reused" });
      return CorpusPackageManifestSchema.parse(previous);
    }
    report.push({ editionId: definition.editionId, action: "rebuilt" });
    return buildPackage(definition, fingerprint);
  });
}
