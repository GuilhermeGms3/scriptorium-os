import { WORKSPACE_SCHEMA_VERSION } from "../database/workspace-migrate";

/** Contextual paragraphs require v25, not the later notebook/course tables.
 * v23/24 retain the existing backup-then-migrate path. Never downgrade a newer DB.
 */
export function contextualImportSchema(version: unknown): { migrate: boolean } {
  if (
    typeof version !== "number" ||
    !Number.isInteger(version) ||
    version < 23 ||
    version > WORKSPACE_SCHEMA_VERSION
  )
    throw new Error("Schema incompatível: migre antes do lote.");
  return { migrate: version < 25 };
}
