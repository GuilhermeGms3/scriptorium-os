import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { KnowledgeProposalPayloadSchema } from "../../src/lib/domain/document-knowledge";

const [workspace, baselinePath, action] = process.argv.slice(2);
if (!workspace || !baselinePath || !["capture", "verify"].includes(action ?? ""))
  throw new Error(
    "Uso: tsx scripts/content/audit-commentary-workspace.ts <workspace> <baseline privado.json> capture|verify",
  );
const db = new DatabaseSync(resolve(workspace), { readOnly: true });
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
try {
  const documents = db
    .prepare("SELECT id,checksum,page_count FROM private_documents ORDER BY id")
    .all();
  const units = db
    .prepare(
      "SELECT id,text_checksum,method FROM semantic_units WHERE method NOT LIKE 'deterministic-source-commentary:%' ORDER BY id",
    )
    .all();
  const legacy = documents.flatMap((document) => {
    const prefix = `${String(document["id"])}:contextual:`;
    return db
      .prepare(
        `SELECT p.id,p.payload_json,p.review_status,d.publication,d.audit_status FROM knowledge_proposals p INDEXED BY sqlite_autoindex_knowledge_proposals_1 LEFT JOIN pipeline_decisions d ON d.proposal_id=p.id WHERE p.id>=? AND p.id<? AND p.method LIKE 'assistant-contextual-reading:%' ORDER BY p.id`,
      )
      .all(prefix, `${String(document["id"])}:contextual;`);
  });
  const baseline = {
    documents: digest(documents),
    units: digest(units),
    legacy: digest(legacy),
    legacyProposals: legacy.length,
    originalUnits: units.length,
  };
  if (action === "capture") {
    writeFileSync(resolve(baselinePath), JSON.stringify(baseline, null, 2), {
      flag: "wx",
      mode: 0o600,
    });
    console.log(JSON.stringify(baseline));
  } else {
    if (
      JSON.stringify(JSON.parse(readFileSync(resolve(baselinePath), "utf8")) as unknown) !==
      JSON.stringify(baseline)
    )
      throw new Error("Baseline anterior divergente: investigar antes de continuar.");
    const quick = db.prepare("PRAGMA quick_check").all();
    if (
      quick.length !== 1 ||
      Object.values(quick[0]!)[0] !== "ok" ||
      db.prepare("PRAGMA foreign_key_check").all().length
    )
      throw new Error("Falha de integridade SQLite.");
    const covered = new Set<string>();
    const direct = new Set<string>();
    const perSource = documents
      .map((document) => {
        const prefix = `${String(document["id"])}:contextual:`;
        const rows = db
          .prepare(
            `SELECT payload_json FROM knowledge_proposals INDEXED BY sqlite_autoindex_knowledge_proposals_1 WHERE id>=? AND id<? AND method LIKE 'deterministic-source-commentary:%' AND proposal_kind='passage-relation'`,
          )
          .all(prefix, `${String(document["id"])}:contextual;`);
        const byBook: Record<string, number> = {};
        const scopes: Record<string, number> = {};
        let confessionalCitations = 0;
        for (const row of rows) {
          const parsed = KnowledgeProposalPayloadSchema.parse(
            JSON.parse(String(row["payload_json"])) as unknown,
          );
          if (parsed.kind !== "passage-relation") throw new Error("Proposta incompatível.");
          byBook[parsed.passage.bookId] = (byBook[parsed.passage.bookId] ?? 0) + 1;
          const scope = parsed.relationScope ?? "verse";
          scopes[scope] = (scopes[scope] ?? 0) + 1;
          if (parsed.referenceRole === "proof-text") {
            confessionalCitations++;
            continue; // A confession citing a verse does not fill its commentary coverage.
          }
          for (const target of [parsed.passage, ...parsed.additionalPassages]) {
            if (target.verseStart === undefined) continue; // A chapter note is not counted as individual verse coverage.
            if ((target.verseEnd ?? target.verseStart) > 500)
              throw new Error("Intervalo inválido no relatório.");
            for (
              let verse = target.verseStart;
              verse <= (target.verseEnd ?? target.verseStart);
              verse++
            ) {
              const key = `${target.bookId}:${target.chapter}:${verse}`;
              covered.add(key);
              if (scope === "verse") direct.add(key);
            }
          }
        }
        return {
          checksum: document["checksum"],
          notes: rows.length,
          confessionalCitations,
          commentaryContexts: rows.length - confessionalCitations,
          byBook,
          scopes,
        };
      })
      .filter((source) => source.notes > 0);
    const report = {
      integrity: "ok",
      baselinePreserved: true,
      legacyProposals: baseline.legacyProposals,
      newNotes: perSource.reduce((sum, source) => sum + source.notes, 0),
      uniqueVerseAddressesIncludingRanges: covered.size,
      uniqueDirectVerseAddresses: direct.size,
      sources: perSource,
    };
    writeFileSync(`${resolve(baselinePath)}.verification.json`, JSON.stringify(report, null, 2), {
      mode: 0o600,
    });
    console.log(JSON.stringify(report));
  }
} finally {
  db.close();
}
