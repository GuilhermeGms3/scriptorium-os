import { LocalTranslationSchema, type LocalTranslation } from "../domain/semantic-content";
import {
  getWorkspaceDatabase,
  type WorkspaceDatabase,
  type WorkspaceRow,
} from "../workspace-runtime/workspace-database";

function requiredString(row: WorkspaceRow, key: string): string {
  const value = row[key];
  if (typeof value !== "string") throw new Error(`Coluna textual inválida: ${key}.`);
  return value;
}

function mapTranslation(row: WorkspaceRow): LocalTranslation {
  const modelRevision = row["model_revision"];
  return LocalTranslationSchema.parse({
    id: requiredString(row, "id"),
    sourceKind: requiredString(row, "source_kind"),
    sourceId: requiredString(row, "source_id"),
    sourceLanguage: requiredString(row, "source_language"),
    targetLanguage: requiredString(row, "target_language"),
    sourceChecksum: requiredString(row, "source_checksum"),
    translatedText: requiredString(row, "translated_text"),
    provider: requiredString(row, "provider"),
    model: requiredString(row, "model"),
    ...(typeof modelRevision === "string" ? { modelRevision } : {}),
    reviewStatus: requiredString(row, "review_status"),
    createdAt: requiredString(row, "created_at"),
    updatedAt: requiredString(row, "updated_at"),
  });
}

export const LocalTranslationRepository = {
  async findCached(
    key: Pick<LocalTranslation, "sourceKind" | "sourceId" | "targetLanguage" | "sourceChecksum">,
    database?: WorkspaceDatabase,
  ): Promise<LocalTranslation | null> {
    const db = database ?? (await getWorkspaceDatabase());
    const row = (
      await db.query(
        `SELECT * FROM local_translations
         WHERE source_kind=? AND source_id=? AND target_language=? AND source_checksum=?
         ORDER BY updated_at DESC LIMIT 1`,
        [key.sourceKind, key.sourceId, key.targetLanguage, key.sourceChecksum],
      )
    )[0];
    return row ? mapTranslation(row) : null;
  },

  async save(translation: LocalTranslation, database?: WorkspaceDatabase): Promise<void> {
    const value = LocalTranslationSchema.parse(translation);
    const db = database ?? (await getWorkspaceDatabase());
    await db.execute(
      `INSERT INTO local_translations(
        id,source_kind,source_id,source_language,target_language,source_checksum,translated_text,
        provider,model,model_revision,review_status,created_at,updated_at
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(source_kind,source_id,target_language,source_checksum,model) DO UPDATE SET
        translated_text=excluded.translated_text,provider=excluded.provider,
        model_revision=excluded.model_revision,review_status=excluded.review_status,
        updated_at=excluded.updated_at`,
      [
        value.id,
        value.sourceKind,
        value.sourceId,
        value.sourceLanguage,
        value.targetLanguage,
        value.sourceChecksum,
        value.translatedText,
        value.provider,
        value.model,
        value.modelRevision ?? null,
        value.reviewStatus,
        value.createdAt,
        value.updatedAt,
      ],
    );
  },
};
