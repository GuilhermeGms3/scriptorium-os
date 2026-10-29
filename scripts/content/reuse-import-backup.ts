import { DatabaseSync } from "node:sqlite";
import { basename, dirname, resolve } from "node:path";
import { realpathSync, statSync } from "node:fs";

/** Explicit operator choice: reuse a prior snapshot, never silently create another multi-GB copy. */
export function reuseImportBackup(workspace: string, args: readonly string[]): string | undefined {
  const index = args.indexOf("--reuse-backup");
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--"))
    throw Error("Informe o backup existente após --reuse-backup.");
  const source = realpathSync(resolve(workspace));
  const candidate = realpathSync(resolve(value));
  if (
    dirname(candidate) !== dirname(source) ||
    !basename(candidate).startsWith(`${basename(source)}.before-`) ||
    !statSync(candidate).isFile()
  )
    throw Error("Reutilização exige um snapshot anterior deste workspace, na mesma pasta.");
  const backup = new DatabaseSync(candidate, { readOnly: true });
  try {
    if (
      !backup.prepare("SELECT max(version) n FROM workspace_migrations").get()?.["n"] ||
      !backup.prepare("SELECT count(*) n FROM private_documents").get()?.["n"]
    )
      throw Error("Backup anterior sem esquema/acervo reconhecidos.");
  } finally {
    backup.close();
  }
  return candidate;
}
