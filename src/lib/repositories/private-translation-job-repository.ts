import {
  getWorkspaceDatabase,
  type WorkspaceDatabase,
  type WorkspaceRow,
} from "../workspace-runtime/workspace-database";

export type PrivateTranslationJobStatus = "pending" | "running" | "paused" | "complete" | "failed";

export interface PrivateTranslationJob {
  documentId: string;
  status: PrivateTranslationJobStatus;
  completedCount: number;
  totalCount: number;
  lastSourceId?: string;
  error?: string;
  updatedAt: string;
}

function mapJob(row: WorkspaceRow): PrivateTranslationJob {
  return {
    documentId: String(row["document_id"]),
    status: String(row["status"]) as PrivateTranslationJobStatus,
    completedCount: Number(row["completed_count"]),
    totalCount: Number(row["total_count"]),
    ...(typeof row["last_source_id"] === "string" ? { lastSourceId: row["last_source_id"] } : {}),
    ...(typeof row["error"] === "string" ? { error: row["error"] } : {}),
    updatedAt: String(row["updated_at"]),
  };
}

export const PrivateTranslationJobRepository = {
  async get(
    documentId: string,
    database?: WorkspaceDatabase,
  ): Promise<PrivateTranslationJob | null> {
    const db = database ?? (await getWorkspaceDatabase());
    const row = (
      await db.query("SELECT * FROM private_translation_jobs WHERE document_id=?", [documentId])
    )[0];
    return row ? mapJob(row) : null;
  },

  async save(
    job: Omit<PrivateTranslationJob, "updatedAt">,
    database?: WorkspaceDatabase,
  ): Promise<void> {
    const db = database ?? (await getWorkspaceDatabase());
    await db.execute(
      `INSERT INTO private_translation_jobs(
         document_id,status,completed_count,total_count,last_source_id,error,updated_at
       ) VALUES(?,?,?,?,?,?,?)
       ON CONFLICT(document_id) DO UPDATE SET
         status=excluded.status,completed_count=excluded.completed_count,
         total_count=excluded.total_count,last_source_id=excluded.last_source_id,
         error=excluded.error,updated_at=excluded.updated_at`,
      [
        job.documentId,
        job.status,
        job.completedCount,
        job.totalCount,
        job.lastSourceId ?? null,
        job.error?.slice(0, 1_000) ?? null,
        new Date().toISOString(),
      ],
    );
  },
};
