import { describe, expect, it } from "vitest";
import { contextualImportSchema } from "./contextual-import-schema";
import { WORKSPACE_SCHEMA_VERSION } from "../database/workspace-migrate";

describe("contextual import schema compatibility", () => {
  it("retains the legacy migration path but does not migrate unrelated notebook/course tables", () => {
    expect(contextualImportSchema(23).migrate).toBe(true);
    expect(contextualImportSchema(24).migrate).toBe(true);
    for (let version = 25; version <= WORKSPACE_SCHEMA_VERSION; version++)
      expect(contextualImportSchema(version).migrate).toBe(false);
  });
  it("rejects missing, corrupt, too old and newer schemas without touching the DB", () => {
    for (const version of [undefined, null, "25", 22, 25.5, NaN, WORKSPACE_SCHEMA_VERSION + 1])
      expect(() => contextualImportSchema(version)).toThrow("Schema incompatível");
  });
});
