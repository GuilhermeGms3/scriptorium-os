import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { GeneratedCorpusManifest } from "../../src/lib/domain/generated-corpus";
import type { CompactChapterShard } from "../../src/lib/domain/compact-corpus";
import type { CorpusPackageManifest } from "../../src/lib/corpus-runtime/contracts";
import { CorpusPackageManifestSchema } from "../../src/lib/corpus-runtime/contracts";
import { buildSearchNormalization } from "../../src/lib/corpus-runtime/search-normalization";
import {
  DEFAULT_BIBLICAL_VERSIFICATION,
  deterministicTextUnitId,
} from "../../src/lib/domain/text-identity";
import {
  greekCell,
  targetTokenId,
  type LinguisticChapter,
  type LinguisticDataset,
  type MorphologicalAnalysis,
} from "../../src/lib/domain/linguistic";
import {
  applyMigrations,
  DATABASE_SCHEMA_VERSION,
  progress,
  removeDatabaseFiles,
  sweepInterruptedBuildFiles,
  timed,
} from "./migrate";
import { seedKnowledgeDatabase } from "./seed-knowledge";
import { buildPrimarySourcePackages } from "./build-primary-source-index";

const root = resolve(import.meta.dirname, "../..");
const migrationsDirectory = join(root, "src/lib/corpus-runtime/migrations");
const outputDirectory = join(root, "public/corpus-packages");
const tagntDirectory = join(
  root,
  "generated/corpora/stepbible-tagnt/efe428a0047bf7b9c3ce2624f60c252c6e435945",
);

function indexTagnt(database: DatabaseSync, sourceManifest: GeneratedCorpusManifest): void {
  const dataset = json<LinguisticDataset>(join(tagntDirectory, "manifest.json"));
  const morphology = json<Record<string, MorphologicalAnalysis>>(
    join(tagntDirectory, "morphology.json"),
  );
  const sourceId = `source:tagnt:${dataset.sourceRevision}`;
  database
    .prepare(
      "INSERT INTO sources(id,source_type,title,locator,checksum,metadata_json) VALUES(?,?,?,?,?,?)",
    )
    .run(
      sourceId,
      "linguistic-dataset",
      "STEPBible TAGNT/TEGMC",
      dataset.sourceRevision,
      dataset.sourcePackageDigest,
      JSON.stringify({
        datasetId: dataset.id,
        attribution: dataset.attribution,
        artifactIds: dataset.artifacts.map((artifact) => artifact.id),
        transformationIds: dataset.transformations.map((transformation) => transformation.id),
      }),
    );
  const updateToken = database.prepare(
    "UPDATE tokens SET lemma_id=?,lemma_text=?,morphology=?,strongs=?,transliteration=?,source_id=? WHERE id=?",
  );
  const insertAnnotation = database.prepare(
    "INSERT INTO token_annotations(id,token_id,annotation_type,value,source_id,provenance_json) VALUES(?,?,?,?,?,?)",
  );
  const ftsTerms = new Map<string, { lemmas: string[]; morphology: string[] }>();
  for (const [bookId, chapters] of Object.entries(dataset.books).sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    for (const chapterNumber of [...chapters].sort((left, right) => left - right)) {
      const chapter = json<LinguisticChapter>(
        join(tagntDirectory, "books", bookId, `${chapterNumber}.json`),
      );
      for (const [verse, position, recordIndex, status, reason, candidates] of chapter.alignments) {
        const tokenId = targetTokenId(bookId, chapterNumber, verse, position);
        const record = recordIndex === null ? null : chapter.records[recordIndex];
        if (recordIndex !== null && !record)
          throw new Error(`Missing TAGNT record ${recordIndex} for ${tokenId}.`);
        const candidateLocators = candidates.map((index) => {
          const candidate = chapter.records[index];
          if (!candidate) throw new Error(`Missing TAGNT candidate ${index} for ${tokenId}.`);
          return candidate[0];
        });
        const compactRecord = record
          ? [
              record[0],
              record[1],
              record[2],
              record[3],
              record[4],
              chapter.editions[record[5]]!,
              record[6],
              record[7],
              record[8],
            ]
          : null;
        insertAnnotation.run(
          `annotation:tagnt:${tokenId}`,
          tokenId,
          "tagnt",
          JSON.stringify([
            compactRecord,
            status,
            reason,
            candidateLocators,
            chapter.sourceArtifactId,
          ]),
          sourceId,
          "{}",
        );
        if (!record || status === "ambiguous" || status === "unmatched") continue;
        const forms = greekCell(record[2]);
        const analyses = [...record[3].matchAll(/=([A-Z0-9-]+)/g)].map(
          (match) =>
            morphology[match[1]!] ?? {
              rawMorphologyCode: match[1]!,
              status: "unmapped" as const,
              features: {},
              extras: {},
            },
        );
        const changed = updateToken.run(
          record[8],
          record[4],
          JSON.stringify(analyses),
          record[7],
          forms.transliteration ?? null,
          sourceId,
          tokenId,
        );
        if (changed.changes !== 1) throw new Error(`TAGNT target token not found: ${tokenId}.`);
        const textUnitId = deterministicTextUnitId({
          corpusId: sourceManifest.corpusId,
          editionId: sourceManifest.editionId,
          workId: `work:${bookId}`,
          sequence: chapterNumber * 1000 + verse,
        });
        const terms = ftsTerms.get(textUnitId) ?? { lemmas: [], morphology: [] };
        terms.lemmas.push(`${record[4]} ${record[8] ?? ""} ${record[7]}`);
        terms.morphology.push(...analyses.map((analysis) => analysis.rawMorphologyCode));
        ftsTerms.set(textUnitId, terms);
      }
    }
  }
  const updateFts = database.prepare(
    "UPDATE text_units_fts SET lemma_text=?,morphology_text=? WHERE text_unit_id=?",
  );
  for (const [textUnitId, terms] of [...ftsTerms].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    updateFts.run(terms.lemmas.join(" "), terms.morphology.join(" "), textUnitId);
  }
}

interface PackageDefinition {
  generatedDirectory: string;
  title: string;
  abbreviation: string;
  language: string;
  script: string;
  direction: "ltr" | "rtl";
  kind: "translation" | "original-language";
  license: string;
}

const definitions: PackageDefinition[] = [
  {
    generatedDirectory: "generated/corpora/biblia-livre/2025.1.0",
    title: "Bíblia Livre N4 2025.1.0",
    abbreviation: "BLIVRE",
    language: "pt-BR",
    script: "Latn",
    direction: "ltr",
    kind: "translation",
    license: "CC-BY-3.0-BR",
  },
  {
    generatedDirectory: "generated/corpora/biblia-portuguesa-mundial/2026-08-19",
    title: "Bíblia Portuguesa Mundial — rascunho em revisão (2026-08-19)",
    abbreviation: "BPM rasc.",
    language: "pt-BR",
    script: "Latn",
    direction: "ltr",
    kind: "translation",
    license: "Public-Domain",
  },
  {
    generatedDirectory: "generated/corpora/sblgnt/1.2",
    title: "SBL Greek New Testament 1.2",
    abbreviation: "SBLGNT",
    language: "grc",
    script: "Grek",
    direction: "ltr",
    kind: "original-language",
    license: "CC-BY-4.0",
  },
  {
    generatedDirectory: "generated/corpora/wlc/2.2",
    title: "Westminster Leningrad Codex with OSHB morphology 2.2",
    abbreviation: "WLC/OSHB",
    language: "hbo",
    script: "Hebr",
    direction: "rtl",
    kind: "original-language",
    license: "WLC-PD;OSHB-CC-BY-4.0",
  },
];

function sha256(data: Uint8Array | string): string {
  return createHash("sha256").update(data).digest("hex");
}

function json<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function plainLexicalText(value: string): string {
  return value
    .replace(/<BR\s*\/>/gi, "\n")
    .replace(/<ref=['"]([^'"]+)['"]>/gi, "$1 (")
    .replace(/<\/ref>/gi, ")")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .trim();
}

function indexTbesg(database: DatabaseSync, corpusId: string): void {
  const lock = json<{
    stepBibleTbesg: {
      revision: string;
      sha256: string;
      sizeBytes: number;
      license: string;
      attribution: string;
      url: string;
    };
  }>(join(root, "content/source-lock.json")).stepBibleTbesg;
  const path = join(root, "corpora/source/stepbible-lexicon", lock.revision, "TBESG.txt");
  const bytes = readFileSync(path);
  if (bytes.byteLength !== lock.sizeBytes || sha256(bytes) !== lock.sha256)
    throw new Error("TBESG custody check failed while building the lexical package.");
  const sourceId = `source:tbesg:${lock.revision}`;
  database
    .prepare(
      "INSERT INTO sources(id,source_type,title,locator,checksum,metadata_json) VALUES(?,?,?,?,?,?)",
    )
    .run(
      sourceId,
      "lexicon",
      "TBESG — Translators Brief lexicon of Extended Strong's for Greek",
      lock.url,
      lock.sha256,
      JSON.stringify({
        license: lock.license,
        attribution: lock.attribution,
        sizeBytes: lock.sizeBytes,
      }),
    );
  database
    .prepare("INSERT OR IGNORE INTO corpus_sources(corpus_id,source_id,role) VALUES(?,?,?)")
    .run(corpusId, sourceId, "lexical-data");
  const insertLexeme = database.prepare(
    "INSERT INTO lexemes(id,language,lemma,transliteration,strongs,source_id,review_status,provenance_json) VALUES(?,?,?,?,?,?,?,?)",
  );
  const insertSense = database.prepare(
    "INSERT INTO lexical_senses(id,lexeme_id,gloss,definition,source_id,ordinal) VALUES(?,?,?,?,?,?)",
  );
  const insertReference = database.prepare(
    "INSERT OR IGNORE INTO lexical_references(lexeme_id,reference_system,reference_value) VALUES(?,?,?)",
  );
  const lines = bytes.toString("utf8").split(/\r?\n/);
  let records = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    if (!/^G\d/.test(line)) continue;
    const [eStrong, dStrong, uStrong, greek, transliteration, morphology, gloss, ...meaningParts] =
      line.split("\t");
    if (!eStrong || !dStrong || !uStrong)
      throw new Error(`Malformed TBESG record at line ${index + 1}.`);
    const normalizedDStrong = dStrong.split(/\s+/)[0]!;
    const id = `lexeme:tbesg:${normalizedDStrong}`;
    const definition = plainLexicalText(meaningParts.join("\t"));
    const references = [
      ...new Set(
        [eStrong, normalizedDStrong, uStrong].filter((value) => /^[GH]\d+[A-Za-z]*$/.test(value)),
      ),
    ];
    insertLexeme.run(
      id,
      "grc",
      (greek || `[${normalizedDStrong}]`).normalize("NFC"),
      transliteration || null,
      references.join(" "),
      sourceId,
      "source-imported",
      JSON.stringify({
        sourceLine: index + 1,
        sourceRevision: lock.revision,
        checksum: lock.sha256,
        morphology,
        sourceLemmaMissing: !greek,
      }),
    );
    insertSense.run(
      `${id}:sense:0`,
      id,
      gloss || definition || "[no brief gloss supplied]",
      definition || null,
      sourceId,
      0,
    );
    for (const reference of references)
      insertReference.run(id, reference.startsWith("G") ? "strong" : "source-reference", reference);
    records += 1;
  }
  if (records < 10_000) throw new Error(`TBESG import unexpectedly produced ${records} entries.`);
}

function indexTbesh(database: DatabaseSync, corpusId: string): void {
  const lock = json<{
    stepBibleTbesh: {
      revision: string;
      sha256: string;
      sizeBytes: number;
      license: string;
      attribution: string;
      url: string;
      redistributionStatus: string;
      includedFields: string[];
      excludedFields: string[];
    };
  }>(join(root, "content/source-lock.json")).stepBibleTbesh;
  const path = join(root, "corpora/source/stepbible-lexicon", lock.revision, "TBESH.txt");
  const bytes = readFileSync(path);
  if (bytes.byteLength !== lock.sizeBytes || sha256(bytes) !== lock.sha256)
    throw new Error("TBESH custody check failed while building the lexical package.");
  const sourceId = `source:tbesh:${lock.revision}`;
  database
    .prepare(
      "INSERT INTO sources(id,source_type,title,locator,checksum,metadata_json) VALUES(?,?,?,?,?,?)",
    )
    .run(
      sourceId,
      "lexicon",
      "TBESH — Translators Brief lexicon of Extended Strong's for Hebrew",
      lock.url,
      lock.sha256,
      JSON.stringify({
        license: lock.license,
        attribution: lock.attribution,
        redistributionStatus: lock.redistributionStatus,
        includedFields: lock.includedFields,
        excludedFields: lock.excludedFields,
        sizeBytes: lock.sizeBytes,
      }),
    );
  database
    .prepare("INSERT OR IGNORE INTO corpus_sources(corpus_id,source_id,role) VALUES(?,?,?)")
    .run(corpusId, sourceId, "lexical-data-partial-rights-gate");
  const insertLexeme = database.prepare(
    "INSERT OR IGNORE INTO lexemes(id,language,lemma,transliteration,strongs,source_id,review_status,provenance_json) VALUES(?,?,?,?,?,?,?,?)",
  );
  const insertSense = database.prepare(
    "INSERT OR IGNORE INTO lexical_senses(id,lexeme_id,gloss,definition,source_id,ordinal) VALUES(?,?,?,?,?,?)",
  );
  const insertReference = database.prepare(
    "INSERT OR IGNORE INTO lexical_references(lexeme_id,reference_system,reference_value) VALUES(?,?,?)",
  );
  let records = 0;
  for (const [index, line] of bytes.toString("utf8").split(/\r?\n/).entries()) {
    if (!/^H\d/.test(line)) continue;
    const [eStrong, dStrongRaw, uStrong, hebrew, transliteration, morphology, gloss] =
      line.split("\t");
    if (!eStrong || !dStrongRaw || !uStrong)
      throw new Error(`Malformed TBESH record at line ${index + 1}.`);
    const dStrong = dStrongRaw.split(/\s+/)[0]!;
    const id = `lexeme:tbesh:${dStrong}`;
    const references = [
      ...new Set([eStrong, dStrong, uStrong].filter((value) => /^H\d+[A-Za-z]*$/.test(value))),
    ];
    insertLexeme.run(
      id,
      "hbo",
      (hebrew || `[${dStrong}]`).normalize("NFC"),
      transliteration || null,
      references.join(" "),
      sourceId,
      "source-imported-rights-limited",
      JSON.stringify({
        sourceLine: index + 1,
        sourceRevision: lock.revision,
        checksum: lock.sha256,
        morphology,
        definitionExcludedForRights: true,
      }),
    );
    insertSense.run(`${id}:sense:0`, id, gloss || "[no brief gloss supplied]", null, sourceId, 0);
    for (const reference of references) {
      insertReference.run(id, "strong", reference);
      insertReference.run(id, "strong", reference.replace(/^H/, ""));
      insertReference.run(id, "strong", reference.replace(/^H0*(?=\d)/, ""));
      insertReference.run(id, "extended-strong", reference);
    }
    records += 1;
  }
  if (records < 10_000) throw new Error(`TBESH import unexpectedly produced ${records} entries.`);
}

function buildWorkShard(
  sourcePath: string,
  editionId: string,
  workId: string,
): {
  id: string;
  workId: string;
  role: "content";
  databasePath: string;
  checksum: string;
  sizeBytes: number;
} {
  const safeWork = workId.replace(/^work:/, "").replace(/[^a-z0-9-]/gi, "-");
  const shardDirectory = join(outputDirectory, editionId);
  const shardPath = join(shardDirectory, `${safeWork}.sqlite3`);
  mkdirSync(shardDirectory, { recursive: true });
  removeDatabaseFiles(shardPath);
  const shard = new DatabaseSync(shardPath);
  applyMigrations(shard, migrationsDirectory, { appliedAt: "1970-01-01T00:00:00.000Z" });
  shard.prepare("ATTACH DATABASE ? AS source_db").run(sourcePath);
  shard.exec("PRAGMA foreign_keys=OFF; BEGIN IMMEDIATE;");
  try {
    shard.exec(`
      INSERT INTO corpora SELECT * FROM source_db.corpora;
      INSERT INTO corpus_editions SELECT * FROM source_db.corpus_editions;
      INSERT INTO sources SELECT * FROM source_db.sources;
      INSERT INTO corpus_sources SELECT * FROM source_db.corpus_sources;
      INSERT INTO versification_schemes SELECT * FROM source_db.versification_schemes;
    `);
    shard.prepare("INSERT INTO works SELECT * FROM source_db.works WHERE id=?").run(workId);
    shard
      .prepare("INSERT INTO text_units SELECT * FROM source_db.text_units WHERE work_id=?")
      .run(workId);
    shard.exec(`
      INSERT INTO text_addresses SELECT a.* FROM source_db.text_addresses a JOIN text_units u ON u.id=a.text_unit_id;
      INSERT INTO tokens SELECT t.* FROM source_db.tokens t JOIN text_units u ON u.id=t.text_unit_id;
      INSERT INTO token_annotations SELECT a.* FROM source_db.token_annotations a JOIN tokens t ON t.id=a.token_id;
      INSERT INTO crosswalks SELECT DISTINCT c.* FROM source_db.crosswalks c JOIN source_db.crosswalk_members m ON m.crosswalk_id=c.id JOIN text_units u ON u.id=m.text_unit_id;
      INSERT INTO crosswalk_members SELECT m.* FROM source_db.crosswalk_members m JOIN crosswalks c ON c.id=m.crosswalk_id;
    `);
    shard
      .prepare("INSERT INTO text_units_fts SELECT * FROM source_db.text_units_fts WHERE work_id=?")
      .run(workId);
    shard.exec("COMMIT; PRAGMA foreign_keys=ON;");
  } catch (error) {
    shard.exec("ROLLBACK");
    shard.close();
    throw error;
  }
  const violations = shard.prepare("PRAGMA foreign_key_check").all();
  if (violations.length) {
    shard.close();
    throw new Error(`Work shard ${workId} has ${violations.length} FK violations.`);
  }
  shard.exec("INSERT INTO text_units_fts(text_units_fts) VALUES('optimize'); VACUUM;");
  shard.close();
  const bytes = readFileSync(shardPath);
  return {
    id: `${editionId}:${safeWork}`,
    workId,
    role: "content",
    databasePath: `/corpus-packages/${editionId}/${safeWork}.sqlite3`,
    checksum: sha256(bytes),
    sizeBytes: bytes.byteLength,
  };
}

function buildLinguisticShard(
  sourcePath: string,
  editionId: string,
): {
  id: string;
  role: "linguistic";
  databasePath: string;
  checksum: string;
  sizeBytes: number;
} {
  const shardDirectory = join(outputDirectory, editionId);
  const shardPath = join(shardDirectory, "linguistic.sqlite3");
  mkdirSync(shardDirectory, { recursive: true });
  removeDatabaseFiles(shardPath);
  const shard = new DatabaseSync(shardPath);
  applyMigrations(shard, migrationsDirectory, { appliedAt: "1970-01-01T00:00:00.000Z" });
  shard.prepare("ATTACH DATABASE ? AS source_db").run(sourcePath);
  shard.exec("PRAGMA foreign_keys=OFF; BEGIN IMMEDIATE;");
  try {
    shard.exec(`
      INSERT INTO corpora SELECT * FROM source_db.corpora;
      INSERT INTO corpus_editions SELECT * FROM source_db.corpus_editions;
      INSERT INTO sources SELECT * FROM source_db.sources;
      INSERT INTO corpus_sources SELECT * FROM source_db.corpus_sources;
      INSERT INTO versification_schemes SELECT * FROM source_db.versification_schemes;
      INSERT INTO works SELECT * FROM source_db.works;
      INSERT INTO text_units(
        id,corpus_id,edition_id,work_id,versification_scheme_id,sequence,unit_type,
        surface_text,normalized_search_text,provenance_json
      )
      SELECT id,corpus_id,edition_id,work_id,versification_scheme_id,sequence,unit_type,
        '', '', '{}'
      FROM source_db.text_units;
      INSERT INTO text_addresses SELECT * FROM source_db.text_addresses;
      INSERT INTO tokens(
        id,text_unit_id,position,surface_form,normalized_form,lemma_id,strongs,language,
        transliteration,source_id,provenance_json,lemma_text
      )
      SELECT id,text_unit_id,position,surface_form,normalized_form,lemma_id,strongs,language,
        transliteration,source_id,'{}',lemma_text
      FROM source_db.tokens
      WHERE lemma_id IS NOT NULL;
      INSERT INTO lexemes SELECT * FROM source_db.lexemes;
      INSERT INTO lexical_senses SELECT * FROM source_db.lexical_senses;
      INSERT INTO lexical_references SELECT * FROM source_db.lexical_references;
      COMMIT;
      PRAGMA foreign_keys=ON;
    `);
  } catch (error) {
    shard.exec("ROLLBACK");
    shard.close();
    throw error;
  }
  const violations = shard.prepare("PRAGMA foreign_key_check").all();
  if (violations.length) {
    shard.close();
    throw new Error(`Linguistic shard has ${violations.length} FK violations.`);
  }
  shard.exec("VACUUM;");
  shard.close();
  const bytes = readFileSync(shardPath);
  return {
    id: `${editionId}:linguistic`,
    role: "linguistic",
    databasePath: `/corpus-packages/${editionId}/linguistic.sqlite3`,
    checksum: sha256(bytes),
    sizeBytes: bytes.byteLength,
  };
}

function buildSearchShard(
  sourcePath: string,
  editionId: string,
): {
  id: string;
  role: "search";
  databasePath: string;
  checksum: string;
  sizeBytes: number;
} {
  const shardDirectory = join(outputDirectory, editionId);
  const shardPath = join(shardDirectory, "search.sqlite3");
  mkdirSync(shardDirectory, { recursive: true });
  removeDatabaseFiles(shardPath);
  const shard = new DatabaseSync(shardPath);
  applyMigrations(shard, migrationsDirectory, { appliedAt: "1970-01-01T00:00:00.000Z" });
  shard.prepare("ATTACH DATABASE ? AS source_db").run(sourcePath);
  shard.exec(`
    DROP TABLE text_units_fts;
    CREATE VIRTUAL TABLE text_units_fts USING fts5(
      text_unit_id UNINDEXED,
      edition_id UNINDEXED,
      work_id UNINDEXED,
      language UNINDEXED,
      title,
      surface_text,
      normalized_search_text,
      lemma_text,
      morphology_text,
      content='',
      tokenize='unicode61 remove_diacritics 0'
    );
  `);
  shard.exec("PRAGMA foreign_keys=OFF; BEGIN IMMEDIATE;");
  try {
    shard.exec(`
      INSERT INTO corpora SELECT * FROM source_db.corpora;
      INSERT INTO corpus_editions SELECT * FROM source_db.corpus_editions;
      INSERT INTO sources SELECT * FROM source_db.sources;
      INSERT INTO versification_schemes SELECT * FROM source_db.versification_schemes;
      INSERT INTO works SELECT * FROM source_db.works;
      INSERT INTO text_units(
        id,corpus_id,edition_id,work_id,versification_scheme_id,sequence,unit_type,
        surface_text,normalized_search_text,provenance_json
      )
      SELECT id,corpus_id,edition_id,work_id,versification_scheme_id,sequence,unit_type,
             surface_text,'','{}'
      FROM source_db.text_units;
      INSERT INTO text_addresses(
        id,text_unit_id,versification_scheme_id,book_id,chapter,verse_start,verse_end,
        subverse_start,subverse_end,display_address
      )
      SELECT id,text_unit_id,versification_scheme_id,book_id,chapter,verse_start,verse_end,
             subverse_start,subverse_end,display_address
      FROM source_db.text_addresses;
      INSERT INTO search_documents(rowid,text_unit_id)
      SELECT rowid,text_unit_id FROM source_db.text_units_fts;
      INSERT INTO text_units_fts(
        rowid,text_unit_id,edition_id,work_id,language,title,surface_text,
        normalized_search_text,lemma_text,morphology_text
      )
      SELECT rowid,text_unit_id,edition_id,work_id,language,title,surface_text,
             normalized_search_text,lemma_text,morphology_text
      FROM source_db.text_units_fts;
      COMMIT;
      PRAGMA foreign_keys=ON;
    `);
  } catch (error) {
    shard.exec("ROLLBACK");
    shard.close();
    throw error;
  }
  const violations = shard.prepare("PRAGMA foreign_key_check").all();
  if (violations.length) {
    shard.close();
    throw new Error(`Search shard has ${violations.length} FK violations.`);
  }
  shard.exec("INSERT INTO text_units_fts(text_units_fts) VALUES('optimize'); VACUUM;");
  shard.close();
  const bytes = readFileSync(shardPath);
  return {
    id: `${editionId}:search`,
    role: "search",
    databasePath: `/corpus-packages/${editionId}/search.sqlite3`,
    checksum: sha256(bytes),
    sizeBytes: bytes.byteLength,
  };
}

function packageFingerprint(definition: PackageDefinition): string {
  const manifestPath = join(root, definition.generatedDirectory, "manifest.json");
  const sourceManifestBytes = readFileSync(manifestPath);
  const sourceManifest = JSON.parse(
    sourceManifestBytes.toString("utf8"),
  ) as GeneratedCorpusManifest;
  const generatedContentDigest = createHash("sha256");
  for (const relativePath of sourceManifest.books
    .flatMap((book) => Object.values(book.chapterFiles))
    .sort()) {
    generatedContentDigest.update(relativePath);
    generatedContentDigest.update("\0");
    generatedContentDigest.update(
      readFileSync(join(root, definition.generatedDirectory, relativePath)),
    );
    generatedContentDigest.update("\n");
  }
  const relevantAuxiliary = definition.generatedDirectory.includes("sblgnt")
    ? readFileSync(join(tagntDirectory, "manifest.json"))
    : definition.generatedDirectory.includes("wlc")
      ? readFileSync(join(root, "content/source-lock.json"))
      : new Uint8Array();
  return sha256(
    JSON.stringify({
      schemaVersion: DATABASE_SCHEMA_VERSION,
      builderVersion: definition.generatedDirectory.includes("wlc")
        ? "corpus-runtime-10.1.2"
        : "corpus-runtime-10.1.1",
      definition,
      sourceManifest: sha256(sourceManifestBytes),
      generatedContent: generatedContentDigest.digest("hex"),
      relevantAuxiliary: sha256(relevantAuxiliary),
    }),
  );
}

function validatesCachedPackage(
  manifest: CorpusPackageManifest,
  fingerprint: string,
  allowLegacyFingerprintAdoption: boolean,
): boolean {
  if (
    (manifest.buildFingerprint
      ? manifest.buildFingerprint !== fingerprint
      : !allowLegacyFingerprintAdoption) ||
    manifest.schemaVersion !== DATABASE_SCHEMA_VERSION
  )
    return false;
  const files = [
    { path: manifest.databasePath, checksum: manifest.checksum },
    ...manifest.parts.map((part) => ({ path: part.databasePath, checksum: part.checksum })),
  ];
  return files.every((file) => {
    const path = join(root, "public", file.path.replace(/^\//, ""));
    return existsSync(path) && sha256(readFileSync(path)) === file.checksum;
  });
}

function buildPackage(
  definition: PackageDefinition,
  buildFingerprint: string,
): CorpusPackageManifest {
  const generatedRoot = join(root, definition.generatedDirectory);
  const sourceManifest = json<GeneratedCorpusManifest>(join(generatedRoot, "manifest.json"));
  const outputPath = join(outputDirectory, `${sourceManifest.editionId}.sqlite3`);
  mkdirSync(dirname(outputPath), { recursive: true });
  removeDatabaseFiles(outputPath);
  progress(`  ${sourceManifest.editionId}: base principal (${sourceManifest.books.length} livros)…`);
  const database = new DatabaseSync(outputPath);
  applyMigrations(database, migrationsDirectory, { appliedAt: "1970-01-01T00:00:00.000Z" });
  database.exec("BEGIN IMMEDIATE");
  try {
    database
      .prepare(
        "INSERT OR REPLACE INTO corpora(id,name,kind,rights_json,provenance_json) VALUES(?,?,?,?,?)",
      )
      .run(
        sourceManifest.corpusId,
        definition.title,
        "scripture",
        JSON.stringify({ license: definition.license, redistribution: "allowed" }),
        JSON.stringify({
          sourceArtifactIds: sourceManifest.sourceArtifactIds,
          transformationIds: sourceManifest.transformations.map((item) => item.id),
          datasetId: sourceManifest.datasetId,
        }),
      );
    database
      .prepare(
        "INSERT OR REPLACE INTO corpus_editions(id,corpus_id,title,abbreviation,language,script,direction,edition_kind,version,package_id,package_checksum) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
      )
      .run(
        sourceManifest.editionId,
        sourceManifest.corpusId,
        definition.title,
        definition.abbreviation,
        definition.language,
        definition.script,
        definition.direction,
        definition.kind,
        sourceManifest.sourceRevision,
        sourceManifest.packageId,
        sourceManifest.sourcePackageDigest.value,
      );
    const insertScheme = database.prepare(
      "INSERT OR IGNORE INTO versification_schemes(id,name,description,version) VALUES(?,?,?,?)",
    );
    insertScheme.run(
      sourceManifest.versificationScheme,
      `${definition.title} source versification`,
      "Reference scheme declared by the imported dataset.",
      sourceManifest.sourceRevision,
    );
    insertScheme.run(
      DEFAULT_BIBLICAL_VERSIFICATION,
      "Scriptorium normalized biblical navigation v1",
      "Internal audited navigation address. It is not a universal textual identity.",
      "1",
    );
    const insertWork = database.prepare(
      "INSERT OR REPLACE INTO works(id,corpus_id,title,work_kind,sequence) VALUES(?,?,?,?,?)",
    );
    const insertUnit = database.prepare(
      "INSERT OR REPLACE INTO text_units(id,corpus_id,edition_id,work_id,versification_scheme_id,sequence,unit_type,surface_text,normalized_search_text,provenance_json) VALUES(?,?,?,?,?,?,?,?,?,?)",
    );
    const insertAddress = database.prepare(
      "INSERT INTO text_addresses(text_unit_id,versification_scheme_id,book_id,chapter,verse_start,verse_end,display_address) VALUES(?,?,?,?,?,?,?)",
    );
    const insertToken = database.prepare(
      "INSERT OR REPLACE INTO tokens(id,text_unit_id,position,surface_form,normalized_form,lemma_id,morphology,strongs,language,transliteration,prefix_text,suffix_text,paragraph_id,starts_paragraph,source_id,provenance_json,lemma_text) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    );
    const insertFts = database.prepare(
      "INSERT INTO text_units_fts(text_unit_id,edition_id,work_id,language,title,surface_text,normalized_search_text,lemma_text,morphology_text) VALUES(?,?,?,?,?,?,?,?,?)",
    );
    const insertCrosswalk = database.prepare(
      "INSERT OR REPLACE INTO crosswalks(id,source_scheme_id,target_scheme_id,relation_type,confidence,notes) VALUES(?,?,?,?,?,?)",
    );
    const insertCrosswalkMember = database.prepare(
      "INSERT OR REPLACE INTO crosswalk_members(crosswalk_id,side,ordinal,text_unit_id,anchor_json) VALUES(?,?,?,?,?)",
    );
    for (const book of sourceManifest.books) {
      const workId = `work:${book.id}`;
      insertWork.run(workId, sourceManifest.corpusId, book.name, "book", book.order);
      for (const [chapterText, relativePath] of Object.entries(book.chapterFiles)) {
        const chapter = json<CompactChapterShard>(join(generatedRoot, relativePath));
        for (const verse of chapter.verses) {
          const verseNumber = verse.verse;
          const sequence = Number(chapterText) * 1000 + verseNumber;
          const unitId = deterministicTextUnitId({
            corpusId: sourceManifest.corpusId,
            editionId: sourceManifest.editionId,
            workId,
            sequence,
          });
          const text = verse.translations[sourceManifest.editionId];
          if (text === undefined)
            throw new Error(
              `Missing ${sourceManifest.editionId} text at ${book.id} ${chapterText}:${verseNumber}.`,
            );
          const provenance = JSON.stringify({
            packageId: sourceManifest.packageId,
            datasetId: sourceManifest.datasetId,
            sourceArtifactId: chapter.sourceArtifactId,
            transformationIds: sourceManifest.transformations.map((item) => item.id),
          });
          const normalized = buildSearchNormalization(text, definition.language);
          insertUnit.run(
            unitId,
            sourceManifest.corpusId,
            sourceManifest.editionId,
            workId,
            sourceManifest.versificationScheme,
            sequence,
            "verse",
            text,
            normalized,
            provenance,
          );
          const display = `${book.name} ${chapterText}:${verseNumber}`;
          insertAddress.run(
            unitId,
            sourceManifest.versificationScheme,
            book.id,
            Number(chapterText),
            verseNumber,
            verseNumber,
            display,
          );
          insertAddress.run(
            unitId,
            DEFAULT_BIBLICAL_VERSIFICATION,
            book.id,
            Number(chapterText),
            verseNumber,
            verseNumber,
            display,
          );
          const sourceAnchor = {
            kind: "text-unit",
            corpusId: sourceManifest.corpusId,
            editionId: sourceManifest.editionId,
            workId,
            versificationSchemeId: sourceManifest.versificationScheme,
            startUnitId: unitId,
          };
          const canonicalAnchor = {
            ...sourceAnchor,
            versificationSchemeId: DEFAULT_BIBLICAL_VERSIFICATION,
          };
          const crosswalkId = `crosswalk:${sourceManifest.editionId}:${book.id}:${sequence}`;
          insertCrosswalk.run(
            crosswalkId,
            sourceManifest.versificationScheme,
            DEFAULT_BIBLICAL_VERSIFICATION,
            "equivalent",
            1,
            "Generated from the importer's explicit canonical navigation mapping.",
          );
          insertCrosswalkMember.run(crosswalkId, "source", 0, unitId, JSON.stringify(sourceAnchor));
          insertCrosswalkMember.run(
            crosswalkId,
            "target",
            0,
            unitId,
            JSON.stringify(canonicalAnchor),
          );
          const tokens = verse.original ?? [];
          for (const token of tokens) {
            insertToken.run(
              token.id,
              unitId,
              token.position,
              token.surface,
              buildSearchNormalization(token.surface, definition.language),
              token.lemmaId ?? null,
              token.morphology ? JSON.stringify(token.morphology) : null,
              token.strongs ?? null,
              definition.language,
              token.transliteration ?? null,
              token.prefix ?? null,
              token.suffix ?? null,
              token.paragraphId ?? null,
              token.startsParagraph === undefined ? null : token.startsParagraph ? 1 : 0,
              null,
              provenance,
              token.lemma ?? null,
            );
          }
          insertFts.run(
            unitId,
            sourceManifest.editionId,
            workId,
            definition.language,
            book.name,
            text,
            normalized,
            tokens
              .map((token) => token.lemma ?? "")
              .filter(Boolean)
              .join(" "),
            tokens
              .map((token) => token.morphology?.code ?? "")
              .filter(Boolean)
              .join(" "),
          );
        }
      }
    }
    if (sourceManifest.editionId === "sblgnt-1.2") {
      indexTagnt(database, sourceManifest);
      indexTbesg(database, sourceManifest.corpusId);
    }
    if (sourceManifest.editionId === "wlc-oshb-2.2") indexTbesh(database, sourceManifest.corpusId);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    database.close();
    throw error;
  }
  database.exec(
    "INSERT INTO search_documents(rowid,text_unit_id) SELECT rowid,text_unit_id FROM text_units_fts",
  );
  database.exec("INSERT INTO text_units_fts(text_units_fts) VALUES('optimize'); VACUUM;");
  const violations = database.prepare("PRAGMA foreign_key_check").all();
  const quickCheck = database.prepare("PRAGMA quick_check").get() as { quick_check?: string };
  database.close();
  if (violations.length || quickCheck.quick_check !== "ok")
    throw new Error(`Invalid generated database ${outputPath}.`);
  const bytes = readFileSync(outputPath);
  const parts: CorpusPackageManifest["parts"] = sourceManifest.books.map((book, index) => {
    progress(`  shard ${index + 1}/${sourceManifest.books.length}: ${book.id}`);
    return buildWorkShard(outputPath, sourceManifest.editionId, `work:${book.id}`);
  });
  progress(`  ${sourceManifest.editionId}: shard de busca…`);
  parts.push(buildSearchShard(outputPath, sourceManifest.editionId));
  if (definition.kind === "original-language") {
    progress(`  ${sourceManifest.editionId}: shard linguístico…`);
    parts.push(buildLinguisticShard(outputPath, sourceManifest.editionId));
  }
  const manifest: CorpusPackageManifest = {
    schemaVersion: DATABASE_SCHEMA_VERSION,
    id: `runtime:${sourceManifest.packageId}`,
    corpusId: sourceManifest.corpusId,
    editionId: sourceManifest.editionId,
    version: sourceManifest.sourceRevision,
    title: definition.title,
    abbreviation: definition.abbreviation,
    works: sourceManifest.books.map((book) => `work:${book.id}`),
    languages: [definition.language],
    databasePath: `/corpus-packages/${sourceManifest.editionId}.sqlite3`,
    checksum: sha256(bytes),
    sourceChecksum: sourceManifest.sourcePackageDigest.value,
    buildFingerprint,
    sizeBytes: statSync(outputPath).size,
    downloadSizeBytes: parts.reduce((total, part) => total + part.sizeBytes, 0),
    storageSizeBytes: parts.reduce((total, part) => total + part.sizeBytes, 0),
    deliveryMode: "work-shards",
    sourceLocation: `/corpus-packages/${sourceManifest.editionId}.sqlite3`,
    dependencies: [],
    parts,
    versificationSchemeId: sourceManifest.versificationScheme,
    rights: {
      license: definition.license,
      redistribution: "allowed",
      attribution: sourceManifest.attribution,
    },
    provenance: {
      packageId: sourceManifest.packageId,
      datasetId: sourceManifest.datasetId,
      sourceArtifactIds: sourceManifest.sourceArtifactIds,
      transformationIds: sourceManifest.transformations.map((item) => item.id),
    },
  };
  return CorpusPackageManifestSchema.parse(manifest);
}

const previousRegistryPath = join(outputDirectory, "registry.json");
const previousPackages = existsSync(previousRegistryPath)
  ? (json<{ packages: CorpusPackageManifest[] }>(previousRegistryPath).packages ?? [])
  : [];
const buildReport: { editionId: string; action: "reused" | "rebuilt" }[] = [];
const sweptFiles = sweepInterruptedBuildFiles(outputDirectory);
if (sweptFiles)
  progress(`Removidos ${sweptFiles} ficheiros laterais de um build interrompido.`);
const packages = definitions.map((definition, index) => {
  const generated = json<GeneratedCorpusManifest>(
    join(root, definition.generatedDirectory, "manifest.json"),
  );
  const step = `[${index + 1}/${definitions.length}] ${generated.editionId}`;
  const fingerprint = packageFingerprint(definition);
  const previous = previousPackages.find((manifest) => manifest.editionId === generated.editionId);
  if (
    previous &&
    validatesCachedPackage(previous, fingerprint, !definition.generatedDirectory.includes("wlc"))
  ) {
    progress(`${step}: atualizado, reaproveitado`);
    buildReport.push({ editionId: generated.editionId, action: "reused" });
    return CorpusPackageManifestSchema.parse({ ...previous, buildFingerprint: fingerprint });
  }
  progress(`${step}: reconstruindo…`);
  buildReport.push({ editionId: generated.editionId, action: "rebuilt" });
  return timed(step, () => buildPackage(definition, fingerprint));
});
packages.push(...buildPrimarySourcePackages(previousPackages, buildReport));
writeFileSync(
  join(outputDirectory, "registry.json"),
  `${JSON.stringify({ schemaVersion: 1, packages }, null, 2)}\n`,
  "utf8",
);
console.log(
  JSON.stringify(
    {
      packages: packages.map(({ editionId, sizeBytes, checksum }) => ({
        editionId,
        sizeBytes,
        checksum,
      })),
      buildReport,
    },
    null,
    2,
  ),
);

function buildKnowledgeDatabase(): {
  path: string;
  checksum: string;
  sizeBytes: number;
  schemaVersion: number;
} {
  const directory = join(root, "public/knowledge");
  const path = join(directory, "knowledge.sqlite3");
  mkdirSync(directory, { recursive: true });
  removeDatabaseFiles(path);
  const database = new DatabaseSync(path);
  applyMigrations(database, migrationsDirectory, { appliedAt: "1970-01-01T00:00:00.000Z" });
  database.exec("BEGIN IMMEDIATE");
  try {
    seedKnowledgeDatabase(database, join(root, "content/scriptorium-content-seed-v0.1.json"));
    database.exec("COMMIT; VACUUM;");
  } catch (error) {
    database.exec("ROLLBACK");
    database.close();
    throw error;
  }
  const violations = database.prepare("PRAGMA foreign_key_check").all();
  if (violations.length) {
    database.close();
    throw new Error(`Knowledge graph has ${violations.length} FK violations.`);
  }
  database.close();
  const bytes = readFileSync(path);
  const manifest = {
    path: "/knowledge/knowledge.sqlite3",
    checksum: sha256(bytes),
    sizeBytes: bytes.byteLength,
    schemaVersion: DATABASE_SCHEMA_VERSION,
  };
  writeFileSync(join(directory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

progress("Construindo a base de conhecimento…");
const knowledge = timed("Base de conhecimento", buildKnowledgeDatabase);
console.log(JSON.stringify({ knowledge }, null, 2));
progress("Pronto.");
