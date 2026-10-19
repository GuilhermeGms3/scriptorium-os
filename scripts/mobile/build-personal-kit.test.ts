import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  openSync,
  closeSync,
  ftruncateSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unzipSync } from "fflate";
import { buildPersonalKit } from "./build-personal-kit";
import { fileHash, MobileManifestSchema, writeMobileArchive } from "./export-content";

const folders: string[] = [];
beforeEach(() => vi.stubEnv("CI", ""));
afterEach(() => {
  vi.unstubAllEnvs();
  folders.splice(0).forEach((folder) => rmSync(folder, { recursive: true, force: true }));
});
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "scriptorium-kit-test-"));
  folders.push(root);
  const source = join(root, "package");
  mkdirSync(source);
  const apkDirectory = join(root, "android/app/build/outputs/apk/debug");
  mkdirSync(apkDirectory, { recursive: true });
  const apk = join(apkDirectory, "app-debug.apk");
  writeFileSync(apk, "DEMO APK — not installable; tests packaging only");
  const installerDirectory = join(root, "scripts/mobile");
  mkdirSync(installerDirectory, { recursive: true });
  writeFileSync(join(installerDirectory, "install-personal-kit.ps1"), "# DEMO installer fixture");
  const database = join(source, "content.sqlite3");
  writeFileSync(database, "DEMO bytes — tests packaging, not SQLite");
  const manifest = MobileManifestSchema.parse({
    format: "scriptorium-mobile-v1",
    schemaVersion: 1,
    id: "a".repeat(64),
    createdAt: "2026-10-18T00:00:00Z",
    privateUseOnly: true,
    editions: [{ id: "demo", title: "DEMO", path: "corpus/demo.sqlite3" }],
    files: [
      { path: "content.sqlite3", sha256: fileHash(database), size: readFileSync(database).length },
      {
        path: "corpus/demo.sqlite3",
        sha256: fileHash(database),
        size: readFileSync(database).length,
      },
    ],
  });
  writeFileSync(join(source, "manifest.json"), JSON.stringify(manifest));
  writeMobileArchive(
    join(source, "acervo.scriptorium"),
    manifest,
    new Map([
      ["content.sqlite3", database],
      ["corpus/demo.sqlite3", database],
    ]),
  );
  return { root, source, apk, output: join(root, "kit") };
}
it("ships the APK, the whole package, an installer and checksums in one private kit", () => {
  const { root, source, apk, output } = fixture();
  buildPersonalKit(root, source, output, false);
  expect(readFileSync(join(output, "acervo.scriptorium"))).toEqual(
    readFileSync(join(source, "acervo.scriptorium")),
  );
  const description = JSON.parse(readFileSync(join(output, "delivery.json"), "utf8")) as Record<
    string,
    unknown
  >;
  expect(description["apkSha256"]).toBe(fileHash(apk));
  expect(description["packageSha256"]).toBe(fileHash(join(source, "acervo.scriptorium")));
  expect(
    Object.keys(unzipSync(readFileSync(join(output, "Scriptorium-completo.zip")))),
  ).toHaveLength(6);
  expect(readFileSync(join(output, "instalar.ps1"), "utf8").charCodeAt(0)).toBe(0xfeff);
});
it("never overwrites an existing output directory", () => {
  const { root, source, output } = fixture();
  mkdirSync(output);
  writeFileSync(join(output, "keep"), "preserve");
  expect(() => buildPersonalKit(root, source, output, false)).toThrow("pasta nova");
  expect(readFileSync(join(output, "keep"), "utf8")).toBe("preserve");
});
it("refuses a giant embedded APK and public CI delivery", () => {
  const { root, source, apk, output } = fixture();
  const descriptor = openSync(apk, "r+");
  try {
    ftruncateSync(descriptor, 513 * 1024 * 1024);
  } finally {
    closeSync(descriptor);
  }
  expect(() => buildPersonalKit(root, source, output, false)).toThrow("APK ainda contém");
  vi.stubEnv("CI", "true");
  expect(() => buildPersonalKit(root, source, output, false)).toThrow("CI público");
});
