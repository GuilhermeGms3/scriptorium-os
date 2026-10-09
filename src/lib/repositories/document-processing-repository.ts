import type {
  DocumentProcessingState,
  DocumentProcessingStatus,
  DocumentProcessingStep,
  DocumentProfile,
  SemanticUnitRole,
} from "../domain/document-profile";
import type { PrivateDocument } from "../domain/private-document";
import { classifyDocumentProfile } from "../application/document-profile-classifier";
import {
  getWorkspaceDatabase,
  type WorkspaceDatabase,
} from "../workspace-runtime/workspace-database";
import { PrivateDocumentRepository } from "./private-document-repository";
import { DocumentKnowledgeRepository } from "./document-knowledge-repository";

function roleForUnit(
  profile: DocumentProfile["profile"],
  unit: { kind: string; text: string },
): { role: SemanticUnitRole; confidence: number } {
  const text = unit.text.trim();
  if (unit.kind === "heading") return { role: "structural-heading", confidence: 0.98 };
  if (unit.kind === "bibliography-entry") return { role: "bibliographic", confidence: 0.98 };
  if (/^(?:sum[aá]rio|[ií]ndice|contents)\b/iu.test(text))
    return { role: "navigation-noise", confidence: 0.9 };
  if (
    profile === "nag-hammadi-anthology" ||
    profile === "ancient-primary-source" ||
    profile === "patristic-work"
  )
    return { role: "primary-source-section", confidence: 0.75 };
  if (profile === "lexicon" || profile === "dictionary" || profile === "encyclopedia")
    return { role: "lexicon-entry", confidence: 0.72 };
  if (profile === "catechism") {
    if (/^(?:pergunta|quest[aã]o|q\.?|\d+[.)])\s/iu.test(text))
      return { role: "question", confidence: 0.82 };
    if (/^(?:resposta|r\.?)[\s:]/iu.test(text)) return { role: "answer", confidence: 0.82 };
  }
  if (profile === "commentary" || profile === "study-bible")
    return { role: "commentary", confidence: 0.72 };
  if (profile === "exegesis-method") return { role: "method-discussion", confidence: 0.72 };
  return { role: "body", confidence: 0.6 };
}

function profileFromRow(row: Record<string, string | number | null | Uint8Array>): DocumentProfile {
  const signalsRaw = String(row["signals_json"] ?? "[]");
  const signals: unknown = JSON.parse(signalsRaw);
  return {
    documentId: String(row["document_id"]),
    profile: String(row["profile"]) as DocumentProfile["profile"],
    method: String(row["method"]),
    confidence: Number(row["confidence"]),
    reviewStatus: String(row["review_status"]) as DocumentProfile["reviewStatus"],
    signals: Array.isArray(signals)
      ? signals.filter((value): value is string => typeof value === "string")
      : [],
    updatedAt: String(row["updated_at"]),
  };
}

export const DocumentProcessingRepository = {
  async workspaceIdentity(database?: WorkspaceDatabase): Promise<string> {
    const db = database ?? (await getWorkspaceDatabase());
    const row = (
      await db.query("SELECT workspace_uuid FROM workspace_manifest WHERE id='workspace'")
    )[0];
    if (!row) throw new Error("O manifesto do workspace não foi inicializado.");
    return String(row["workspace_uuid"]);
  },

  async getProfile(
    documentId: string,
    database?: WorkspaceDatabase,
  ): Promise<DocumentProfile | null> {
    const db = database ?? (await getWorkspaceDatabase());
    const row = (
      await db.query("SELECT * FROM private_document_profiles WHERE document_id=?", [documentId])
    )[0];
    return row ? profileFromRow(row) : null;
  },

  async ensureProfile(
    document: PrivateDocument,
    database?: WorkspaceDatabase,
  ): Promise<DocumentProfile> {
    const db = database ?? (await getWorkspaceDatabase());
    const existing = await this.getProfile(document.id, db);
    if (existing?.reviewStatus === "accepted") return existing;
    const pages = await PrivateDocumentRepository.listPages(document.id, { limit: 20 }, db);
    const sample = pages
      .filter((page) => page.text.trim())
      .slice(0, 12)
      .map((page) => page.text)
      .join("\n");
    const classified = classifyDocumentProfile(document.title, sample);
    const updatedAt = new Date().toISOString();
    await db.transaction([
      {
        sql: `INSERT INTO private_document_profiles(
          document_id,profile,method,confidence,review_status,signals_json,updated_at
        ) VALUES(?,?,?,?,'machine-proposed',?,?)
        ON CONFLICT(document_id) DO UPDATE SET
          profile=excluded.profile,method=excluded.method,confidence=excluded.confidence,
          signals_json=excluded.signals_json,updated_at=excluded.updated_at
        WHERE private_document_profiles.review_status!='accepted'`,
        bind: [
          document.id,
          classified.profile,
          "deterministic-document-profile:1",
          classified.confidence,
          JSON.stringify(classified.signals),
          updatedAt,
        ],
      },
      {
        sql: `INSERT INTO document_processing_steps(
          document_id,step,status,completed_units,total_units,checkpoint_json,last_error,updated_at
        ) VALUES(?,'classification','complete',1,1,?,NULL,?)
        ON CONFLICT(document_id,step) DO UPDATE SET status='complete',completed_units=1,total_units=1,
          checkpoint_json=excluded.checkpoint_json,last_error=NULL,updated_at=excluded.updated_at`,
        bind: [document.id, JSON.stringify({ profile: classified.profile }), updatedAt],
      },
    ]);
    const saved = await this.getProfile(document.id, db);
    if (!saved) throw new Error(`O perfil de ${document.title} não pôde ser persistido.`);
    return saved;
  },

  async recordStep(
    documentId: string,
    step: DocumentProcessingStep,
    status: DocumentProcessingStatus,
    details: {
      completedUnits?: number;
      totalUnits?: number;
      checkpoint?: Record<string, unknown>;
      error?: string;
    } = {},
    database?: WorkspaceDatabase,
  ): Promise<void> {
    const db = database ?? (await getWorkspaceDatabase());
    await db.execute(
      `INSERT INTO document_processing_steps(
        document_id,step,status,completed_units,total_units,checkpoint_json,last_error,updated_at
      ) VALUES(?,?,?,?,?,?,?,?)
      ON CONFLICT(document_id,step) DO UPDATE SET status=excluded.status,
        completed_units=excluded.completed_units,total_units=excluded.total_units,
        checkpoint_json=excluded.checkpoint_json,last_error=excluded.last_error,updated_at=excluded.updated_at`,
      [
        documentId,
        step,
        status,
        details.completedUnits ?? 0,
        details.totalUnits ?? 0,
        JSON.stringify(details.checkpoint ?? {}),
        details.error ?? null,
        new Date().toISOString(),
      ],
    );
  },

  async listStates(
    documentId: string,
    database?: WorkspaceDatabase,
  ): Promise<DocumentProcessingState[]> {
    const db = database ?? (await getWorkspaceDatabase());
    const rows = await db.query(
      "SELECT * FROM document_processing_steps WHERE document_id=? ORDER BY rowid",
      [documentId],
    );
    return rows.map((row) => {
      const checkpoint: unknown = JSON.parse(String(row["checkpoint_json"] ?? "{}"));
      return {
        documentId,
        step: String(row["step"]) as DocumentProcessingStep,
        status: String(row["status"]) as DocumentProcessingStatus,
        completedUnits: Number(row["completed_units"]),
        totalUnits: Number(row["total_units"]),
        checkpoint:
          checkpoint && typeof checkpoint === "object" && !Array.isArray(checkpoint)
            ? (checkpoint as Record<string, unknown>)
            : {},
        ...(row["last_error"] ? { lastError: String(row["last_error"]) } : {}),
        updatedAt: String(row["updated_at"]),
      };
    });
  },

  async annotateUnits(
    document: PrivateDocument,
    profile: DocumentProfile,
    database?: WorkspaceDatabase,
  ): Promise<number> {
    const db = database ?? (await getWorkspaceDatabase());
    const rows = await db.query(
      "SELECT id FROM semantic_units WHERE document_id=? ORDER BY ordinal",
      [document.id],
    );
    let annotated = 0;
    for (let offset = 0; offset < rows.length; offset += 300) {
      const ids = rows.slice(offset, offset + 300).map((row) => String(row["id"]));
      const units = await DocumentKnowledgeRepository.listUnits(document.id, ids, db);
      if (!units.length) continue;
      const now = new Date().toISOString();
      await db.transaction(
        units.map((unit) => {
          const classification = roleForUnit(profile.profile, unit);
          return {
            sql: `INSERT INTO semantic_unit_roles(unit_id,document_id,role,method,confidence,updated_at)
              VALUES(?,?,?,?,?,?) ON CONFLICT(unit_id) DO UPDATE SET role=excluded.role,
              method=excluded.method,confidence=excluded.confidence,updated_at=excluded.updated_at`,
            bind: [
              unit.id,
              document.id,
              classification.role,
              "deterministic-unit-role:1",
              classification.confidence,
              now,
            ],
          };
        }),
      );
      annotated += units.length;
    }
    await this.recordStep(
      document.id,
      "analysis",
      "complete",
      {
        completedUnits: annotated,
        totalUnits: rows.length,
        checkpoint: { profile: profile.profile },
      },
      db,
    );
    return annotated;
  },
};
