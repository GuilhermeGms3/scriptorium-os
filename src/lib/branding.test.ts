import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Scriptorium branding", () => {
  it("uses the product icon instead of the cached template favicon", () => {
    const root = readFileSync(resolve("src/routes/__root.tsx"), "utf8");
    expect(root).toContain('href: "/scriptorium-icon.svg"');
    expect(root).not.toContain('href: "/favicon.ico"');
    expect(readFileSync(resolve("public/scriptorium-icon.svg"), "utf8")).toContain(
      "<title>Scriptorium</title>",
    );
  });
  it("does not redistribute the old template icon", () => {
    expect(existsSync(resolve("public/favicon.ico"))).toBe(false);
  });
});
