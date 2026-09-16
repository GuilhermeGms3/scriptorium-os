import { z } from "zod";
import { DuplicateSourceError, ImportValidationError } from "../domain/errors";
import {
  getWorkspaceDatabase,
  type WorkspaceDatabase,
  type WorkspaceSqlValue,
} from "../workspace-runtime/workspace-database";

export type BibliographicImportFormat = "csl-json" | "bibtex" | "ris";
export interface ImportIssue {
  index: number;
  severity: "error" | "warning";
  code: string;
  message: string;
}
export interface ImportCandidate {
  title: string;
  authors: string[];
  year?: number;
  language?: string;
  publisher?: string;
  sourceType: string;
  unsupportedType?: string;
  malformedDate?: boolean;
  identifiers: Record<string, string>;
  original: unknown;
}
export interface ImportPreview {
  format: BibliographicImportFormat;
  candidates: ImportCandidate[];
  issues: ImportIssue[];
}
export interface ImportReport {
  imported: number;
  duplicates: number;
  skipped: number;
  invalid: number;
  warnings: number;
  sourceIds: string[];
  issues: ImportIssue[];
}

const CslItemSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    type: z.string().optional(),
    title: z.string().min(1),
    author: z
      .array(
        z.object({
          family: z.string().optional(),
          given: z.string().optional(),
          literal: z.string().optional(),
        }),
      )
      .optional(),
    issued: z
      .object({
        "date-parts": z.array(z.array(z.number())).optional(),
        literal: z.string().optional(),
      })
      .optional(),
    publisher: z.string().optional(),
    language: z.string().optional(),
    DOI: z.string().optional(),
    ISBN: z.string().optional(),
    ISSN: z.string().optional(),
    URL: z.string().optional(),
  })
  .passthrough();

function normalizeIdentifier(scheme: string, value: string): string {
  const clean = value.trim();
  if (scheme === "doi") return clean.toLowerCase().replace(/^https?:\/\/(?:dx\.)?doi\.org\//, "");
  if (scheme === "isbn") return clean.replace(/[^0-9X]/gi, "").toUpperCase();
  return clean;
}
function normalizeTitle(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
function sourceType(value?: string): { sourceType: string; unsupportedType?: string } {
  const types: Record<string, string> = {
    article: "journal-article",
    "article-journal": "journal-article",
    jour: "journal-article",
    journal: "journal-article",
    chapter: "chapter",
    thesis: "thesis",
    webpage: "website",
    web: "website",
    manuscript: "manuscript",
    dataset: "dataset",
    book: "book",
  };
  if (!value) return { sourceType: "book" };
  const normalized = value.toLocaleLowerCase();
  return types[normalized]
    ? { sourceType: types[normalized] }
    : { sourceType: "user-document", unsupportedType: value };
}
function parseYear(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value) && value >= -5000 && value <= 3000)
    return value;
  if (typeof value === "string") {
    const match = /-?\d{1,4}/.exec(value);
    if (match) return parseYear(Number(match[0]));
  }
  return undefined;
}
function cslAuthors(item: z.infer<typeof CslItemSchema>): string[] {
  return (item.author ?? [])
    .map((author) => author.literal ?? [author.family, author.given].filter(Boolean).join(", "))
    .filter(Boolean);
}

function parseCsl(input: string): ImportCandidate[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    throw new ImportValidationError("CSL-JSON is not valid JSON.");
  }
  const items = Array.isArray(parsed) ? parsed : [parsed];
  return items.map((raw) => {
    const item = CslItemSchema.parse(raw);
    const year = item.issued?.["date-parts"]?.[0]?.[0] ?? parseYear(item.issued?.literal);
    const identifiers: Record<string, string> = {};
    for (const [scheme, value] of [
      ["doi", item.DOI],
      ["isbn", item.ISBN],
      ["issn", item.ISSN],
      ["url", item.URL],
    ] as const)
      if (value) identifiers[scheme] = normalizeIdentifier(scheme, value);
    return {
      title: item.title,
      authors: cslAuthors(item),
      ...(year !== undefined ? { year } : {}),
      ...(item.issued && year === undefined ? { malformedDate: true } : {}),
      ...(item.language ? { language: item.language } : {}),
      ...(item.publisher ? { publisher: item.publisher } : {}),
      ...sourceType(item.type),
      identifiers,
      original: raw,
    };
  });
}

function parseBibtex(input: string): ImportCandidate[] {
  const entries = [...input.matchAll(/@(\w+)\s*\{\s*([^,]+),([\s\S]*?)(?=\n?@|$)/g)];
  if (!entries.length) throw new ImportValidationError("No valid BibTeX entry was found.");
  return entries.map((entry) => {
    const body = entry[3] ?? "";
    const fields = Object.fromEntries(
      [...body.matchAll(/(\w+)\s*=\s*[{"]([^}"]*)[}"]/g)].map((match) => [
        match[1]!.toLowerCase(),
        match[2]!.trim(),
      ]),
    );
    if (!fields["title"]) throw new ImportValidationError(`BibTeX entry ${entry[2]} has no title.`);
    const identifiers: Record<string, string> = {};
    for (const scheme of ["doi", "isbn", "issn", "url"])
      if (fields[scheme]) identifiers[scheme] = normalizeIdentifier(scheme, fields[scheme]);
    const year = parseYear(fields["year"]);
    return {
      title: fields["title"],
      authors: (fields["author"] ?? "").split(/\s+and\s+/i).filter(Boolean),
      ...(year !== undefined ? { year } : {}),
      ...(fields["year"] && year === undefined ? { malformedDate: true } : {}),
      ...(fields["language"] ? { language: fields["language"] } : {}),
      ...(fields["publisher"] ? { publisher: fields["publisher"] } : {}),
      ...sourceType(entry[1]?.toLowerCase()),
      identifiers,
      original: entry[0],
    };
  });
}

function parseRis(input: string): ImportCandidate[] {
  const records = input.split(/\r?\nER\s*-\s*/).filter((part) => part.trim());
  const result = records.map((record) => {
    const fields = new Map<string, string[]>();
    for (const line of record.split(/\r?\n/)) {
      const match = /^([A-Z0-9]{2})\s*-\s*(.*)$/.exec(line);
      if (match) fields.set(match[1]!, [...(fields.get(match[1]!) ?? []), match[2]!.trim()]);
    }
    const title = fields.get("TI")?.[0] ?? fields.get("T1")?.[0];
    if (!title) throw new ImportValidationError("RIS record has no TI/T1 title.");
    const identifiers: Record<string, string> = {};
    const doi = fields.get("DO")?.[0];
    const isbn = fields.get("SN")?.[0];
    if (doi) identifiers["doi"] = normalizeIdentifier("doi", doi);
    if (isbn)
      identifiers[isbn.replace(/[^0-9X]/gi, "").length >= 10 ? "isbn" : "issn"] =
        normalizeIdentifier("isbn", isbn);
    const year = parseYear(fields.get("PY")?.[0] ?? fields.get("Y1")?.[0]);
    const rawDate = fields.get("PY")?.[0] ?? fields.get("Y1")?.[0];
    return {
      title,
      authors: fields.get("AU") ?? fields.get("A1") ?? [],
      ...(year !== undefined ? { year } : {}),
      ...(rawDate && year === undefined ? { malformedDate: true } : {}),
      ...(fields.get("LA")?.[0] ? { language: fields.get("LA")![0] } : {}),
      ...(fields.get("PB")?.[0] ? { publisher: fields.get("PB")![0] } : {}),
      ...sourceType(fields.get("TY")?.[0]?.toLowerCase()),
      identifiers,
      original: record,
    };
  });
  if (!result.length) throw new ImportValidationError("No RIS record was found.");
  return result;
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
function uid(prefix: string): string {
  return `${prefix}:${crypto.randomUUID()}`;
}

export const SourceImportService = {
  preview(format: BibliographicImportFormat, input: string): ImportPreview {
    let candidates: ImportCandidate[] = [];
    const issues: ImportIssue[] = [];
    try {
      candidates =
        format === "csl-json"
          ? parseCsl(input)
          : format === "bibtex"
            ? parseBibtex(input)
            : parseRis(input);
    } catch (error) {
      issues.push({
        index: 0,
        severity: "error",
        code: "malformed-input",
        message: error instanceof Error ? error.message : String(error),
      });
    }
    candidates.forEach((candidate, index) => {
      if (!candidate.title.trim())
        issues.push({
          index,
          severity: "error",
          code: "missing-title",
          message: "Title is required.",
        });
      if (candidate.unsupportedType)
        issues.push({
          index,
          severity: "error",
          code: "unsupported-type",
          message: `Unsupported bibliographic type: ${candidate.unsupportedType}`,
        });
      if (candidate.malformedDate)
        issues.push({
          index,
          severity: "error",
          code: "malformed-date",
          message: "Publication date could not be normalized.",
        });
      const doi = candidate.identifiers["doi"];
      if (doi && !/^10\.\d{4,9}\/[\S]+$/i.test(doi))
        issues.push({
          index,
          severity: "error",
          code: "invalid-doi",
          message: `Invalid DOI: ${doi}`,
        });
      const isbn = candidate.identifiers["isbn"];
      if (isbn && !/^(?:\d{9}[\dX]|\d{13})$/.test(isbn))
        issues.push({
          index,
          severity: "error",
          code: "invalid-isbn",
          message: `Invalid ISBN: ${isbn}`,
        });
      if (!candidate.authors.length)
        issues.push({
          index,
          severity: "warning",
          code: "missing-author",
          message: "No author supplied; the source will remain unattributed.",
        });
    });
    return { format, candidates, issues };
  },

  async import(
    format: BibliographicImportFormat,
    input: string,
    database?: WorkspaceDatabase,
  ): Promise<ImportReport> {
    const preview = this.preview(format, input);
    const db = database ?? (await getWorkspaceDatabase());
    const sourceIds: string[] = [];
    let duplicates = 0;
    let invalid = 0;
    const issues = [...preview.issues];
    for (const [index, candidate] of preview.candidates.entries()) {
      if (issues.some((issue) => issue.index === index && issue.severity === "error")) {
        invalid++;
        continue;
      }
      const identifierEntries = Object.entries(candidate.identifiers);
      const normalizedTitle = normalizeTitle(candidate.title);
      let duplicate = false;
      for (const [scheme, value] of identifierEntries) {
        if (
          (
            await db.query(
              "SELECT source_id FROM source_identifiers WHERE scheme=? AND normalized_value=?",
              [scheme, normalizeIdentifier(scheme, value)],
            )
          ).length
        )
          duplicate = true;
      }
      if (!duplicate) {
        const author = candidate.authors[0] ? normalizeTitle(candidate.authors[0]) : "";
        duplicate =
          (
            await db.query(
              "SELECT s.id FROM bibliographic_sources s LEFT JOIN source_authors sa ON sa.source_id=s.id LEFT JOIN authors a ON a.id=sa.author_id WHERE s.normalized_title=? AND coalesce(s.publication_year,-9999)=? AND (?='' OR lower(a.canonical_name)=?) LIMIT 1",
              [
                normalizedTitle,
                candidate.year ?? -9999,
                author,
                candidate.authors[0]?.toLocaleLowerCase() ?? "",
              ],
            )
          ).length > 0;
      }
      if (duplicate) {
        duplicates++;
        issues.push({
          index,
          severity: "warning",
          code: "duplicate",
          message: `Possible duplicate skipped: ${candidate.title}`,
        });
        continue;
      }
      const now = new Date().toISOString();
      const sourceId = uid("source");
      const workId = uid("work");
      const editionId = uid("edition");
      const statements: { sql: string; bind?: WorkspaceSqlValue[] }[] = [
        {
          sql: "INSERT INTO works(id,canonical_title,alternative_titles_json,language_original,work_type,created_at,updated_at) VALUES(?,?,?,?,?,?,?)",
          bind: [
            workId,
            candidate.title,
            "[]",
            candidate.language ?? null,
            candidate.sourceType,
            now,
            now,
          ],
        },
        {
          sql: "INSERT INTO editions(id,work_id,title,language,publisher,publication_date_json,edition_statement,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)",
          bind: [
            editionId,
            workId,
            candidate.title,
            candidate.language ?? "und",
            candidate.publisher ?? null,
            candidate.year ? JSON.stringify({ kind: "exact-year", year: candidate.year }) : null,
            "Imported bibliographic record",
            now,
            now,
          ],
        },
        {
          sql: "INSERT INTO bibliographic_sources(id,work_id,edition_id,title,normalized_title,source_type,language,publication_year,publisher,rights_json,provenance_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
          bind: [
            sourceId,
            workId,
            editionId,
            candidate.title,
            normalizedTitle,
            candidate.sourceType,
            candidate.language ?? null,
            candidate.year ?? null,
            candidate.publisher ?? null,
            JSON.stringify({
              metadataRedistributable: true,
              contentRedistributable: false,
              localOnly: true,
            }),
            JSON.stringify({
              origin: "user-import",
              importMethod: format,
              importedAt: now,
              checksum: await sha256(JSON.stringify(candidate.original)),
            }),
            now,
            now,
          ],
        },
      ];
      for (const [ordinal, name] of candidate.authors.entries()) {
        const authorId = `author:${(await sha256(normalizeTitle(name))).slice(0, 24)}`;
        statements.push(
          {
            sql: "INSERT OR IGNORE INTO authors(id,canonical_name,author_type,tradition_ids_json,created_at,updated_at) VALUES(?,?,'person','[]',?,?)",
            bind: [authorId, name, now, now],
          },
          {
            sql: "INSERT INTO work_authors(work_id,author_id,ordinal) VALUES(?,?,?)",
            bind: [workId, authorId, ordinal],
          },
          {
            sql: "INSERT INTO source_authors(source_id,author_id,ordinal) VALUES(?,?,?)",
            bind: [sourceId, authorId, ordinal],
          },
        );
      }
      for (const [scheme, value] of identifierEntries)
        statements.push({
          sql: "INSERT INTO source_identifiers(source_id,scheme,value,normalized_value) VALUES(?,?,?,?)",
          bind: [sourceId, scheme, value, normalizeIdentifier(scheme, value)],
        });
      statements.push({
        sql: "INSERT INTO workspace_fts(entity_kind,entity_id,title,body) VALUES('source',?,?,?)",
        bind: [sourceId, candidate.title, candidate.authors.join(" ")],
      });
      try {
        await db.transaction(statements);
        sourceIds.push(sourceId);
      } catch (error) {
        if (error instanceof DuplicateSourceError) duplicates++;
        else {
          invalid++;
          issues.push({
            index,
            severity: "error",
            code: "persistence",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
    return {
      imported: sourceIds.length,
      duplicates,
      skipped: duplicates + invalid,
      invalid,
      warnings: issues.filter((issue) => issue.severity === "warning").length,
      sourceIds,
      issues,
    };
  },
};
