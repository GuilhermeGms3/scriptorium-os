import { it, expect } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { reuseImportBackup } from "./reuse-import-backup";

it("requires explicit reuse and validates a prior SQLite snapshot without copying it", () => {
  const folder = mkdtempSync(join(tmpdir(), "scriptorium-backup-policy-"));
  const source = join(folder, "workspace.sqlite3");
  const previous = source + ".before-test";
  writeFileSync(source, "placeholder");
  const db = new DatabaseSync(previous);
  db.exec(
    "CREATE TABLE workspace_migrations(version INTEGER); INSERT INTO workspace_migrations VALUES(26); CREATE TABLE private_documents(id TEXT); INSERT INTO private_documents VALUES('fixture');",
  );
  db.close();
  try {
    expect(reuseImportBackup(source, [])).toBeUndefined();
    expect(reuseImportBackup(source, ["--reuse-backup", previous])).toBe(previous);
    expect(() => reuseImportBackup(source, ["--reuse-backup"])).toThrow();
    expect(() => reuseImportBackup(source, ["--reuse-backup", source])).toThrow();
    writeFileSync(source + ".before-invalid", "not SQLite");
    expect(() =>
      reuseImportBackup(source, ["--reuse-backup", source + ".before-invalid"]),
    ).toThrow();
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
