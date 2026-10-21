import { it, expect } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { libraryUtilization } from "./library-utilization-repository";
import type { WorkspaceDatabase, WorkspaceRow } from "../workspace-runtime/protocol";
it("separates extraction, raw links, visible commentary, proof texts and audits using scheme-aware targets", async () => {
  const native = new DatabaseSync(":memory:");
  try {
    native.exec(
      "CREATE TABLE private_documents(id TEXT,title TEXT,checksum TEXT,page_count INTEGER,text_page_count INTEGER); CREATE TABLE semantic_units(id TEXT,document_id TEXT); CREATE TABLE knowledge_proposals(id TEXT,document_id TEXT,proposal_kind TEXT,payload_json TEXT,review_status TEXT); CREATE TABLE pipeline_decisions(proposal_id TEXT,publication TEXT,audit_status TEXT); INSERT INTO private_documents VALUES('doc','Livro','sha',10,9),('empty','Sem texto','sha2',20,0); INSERT INTO semantic_units VALUES('u','doc');",
    );
    const insert = native.prepare(
      "INSERT INTO knowledge_proposals VALUES(?,'doc','passage-relation',?,?)",
    );
    const passage = {
      bookId: "john",
      chapter: 1,
      verseStart: 1,
      versificationSchemeId: "scheme-a",
    };
    insert.run("raw", JSON.stringify({ passage }), "machine-proposed");
    insert.run(
      "visible",
      JSON.stringify({ passage, contextualAnalysis: { title: "Contexto" } }),
      "machine-proposed",
    );
    insert.run(
      "confession",
      JSON.stringify({
        passage: { ...passage, versificationSchemeId: "scheme-b" },
        contextualAnalysis: { title: "Texto-prova" },
        referenceRole: "proof-text",
      }),
      "accepted",
    );
    native.exec("INSERT INTO pipeline_decisions VALUES('visible','machine-visible','pending');");
    const db: WorkspaceDatabase = {
      persistence: "memory",
      query: async (sql, bind = []) => native.prepare(sql).all(...bind) as WorkspaceRow[],
      execute: async () => {
        throw Error("read-only");
      },
      transaction: async () => {
        throw Error("read-only");
      },
      reset: async () => {
        throw Error("read-only");
      },
    };
    const all = await libraryUtilization({}, db);
    expect(all.find((r) => r.id === "doc")).toMatchObject({
      extracted: 9,
      structured: 1,
      linked: 3,
      available: 2,
      proof_texts: 1,
      audited: 1,
    });
    const filtered = await libraryUtilization(
      { bookId: "john", chapter: 1, verse: 1, scheme: "scheme-a" },
      db,
    );
    expect(filtered.find((r) => r.id === "doc")).toMatchObject({
      linked: 2,
      available: 1,
      proof_texts: 0,
      audited: 0,
    });
    expect(all.find((r) => r.id === "empty")?.structured).toBe(0);
  } finally {
    native.close();
  }
});
