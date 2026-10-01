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
    key: Pick<LocalTranslation, "sourceKind" | "sourceId" | "targetLanguage" | "sourceChecksum"> & {
      model?: string;
      modelRevision?: string;
    },
    database?: WorkspaceDatabase,
  ): Promise<LocalTranslation | null> {
    const db = database ?? (await getWorkspaceDatabase());
    const modelClause = key.model ? "AND model=?" : "";
    const revisionClause = key.modelRevision ? "AND coalesce(model_revision,'main')=?" : "";
    const bind = [
      key.sourceKind,
      key.sourceId,
      key.targetLanguage,
      key.sourceChecksum,
      ...(key.model ? [key.model] : []),
      ...(key.modelRevision ? [key.modelRevision] : []),
    ];
    const row = (
      await db.query(
        `SELECT * FROM local_translations
         WHERE source_kind=? AND source_id=? AND target_language=? AND source_checksum=?
           ${modelClause} ${revisionClause}
         ORDER BY updated_at DESC LIMIT 1`,
        bind,
      )
    )[0];
    return row ? mapTranslation(row) : null;
  },

  async listForSources(
    sourceKind: LocalTranslation["sourceKind"],
    sourceIds: readonly string[],
    database?: WorkspaceDatabase,
  ): Promise<LocalTranslation[]> {
    if (!sourceIds.length) return [];
    const db = database ?? (await getWorkspaceDatabase());
    const result: LocalTranslation[] = [];
    const unique = [...new Set(sourceIds)];
    for (let offset = 0; offset < unique.length; offset += 400) {
      const batch = unique.slice(offset, offset + 400);
      const placeholders = batch.map(() => "?").join(",");
      result.push(
        ...(
          await db.query(
            `SELECT * FROM local_translations
             WHERE source_kind=? AND source_id IN (${placeholders})
             ORDER BY source_id,updated_at DESC`,
            [sourceKind, ...batch],
          )
        ).map(mapTranslation),
      );
    }
    const newestBySource = new Map<string, LocalTranslation>();
    for (const translation of result)
      if (!newestBySource.has(translation.sourceId))
        newestBySource.set(translation.sourceId, translation);
    return [...newestBySource.values()];
  },

  async review(id: string, translatedText: string, database?: WorkspaceDatabase): Promise<void> {
    const normalized = translatedText.normalize("NFC").trim();
    if (!normalized) throw new Error("A tradução revisada não pode ficar vazia.");
    const db = database ?? (await getWorkspaceDatabase());
    await db.execute(
      `UPDATE local_translations
       SET translated_text=?,review_status='human-reviewed',updated_at=? WHERE id=?`,
      [normalized, new Date().toISOString(), id],
    );
  },

  async save(translation: LocalTranslation, database?: WorkspaceDatabase): Promise<void> {
    const value = LocalTranslationSchema.parse(translation);
    const db = database ?? (await getWorkspaceDatabase());
    await db.execute(
      `INSERT INTO local_translations(
        id,source_kind,source_id,source_language,target_language,source_checksum,translated_text,
        provider,model,model_revision,review_status,created_at,updated_at
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(source_kind,source_id,target_language,source_checksum,model,model_revision) DO UPDATE SET
        translated_text=CASE
          WHEN local_translations.review_status='human-reviewed'
          THEN local_translations.translated_text ELSE excluded.translated_text END,
        provider=excluded.provider,
        model_revision=excluded.model_revision,
        review_status=CASE
          WHEN local_translations.review_status='human-reviewed'
          THEN local_translations.review_status ELSE excluded.review_status END,
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
        value.modelRevision ?? "main",
        value.reviewStatus,
        value.createdAt,
        value.updatedAt,
      ],
    );
  },
};
