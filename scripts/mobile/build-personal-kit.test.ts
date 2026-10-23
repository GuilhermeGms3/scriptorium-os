import { spawnSync } from "node:child_process";
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
import { join, resolve } from "node:path";
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

it.skipIf(process.platform !== "win32").each([false, true])(
  "authenticates binary transfer on Windows PowerShell 5.1 (corrupted: %s)",
  (corrupted) => {
    const { root, source, output } = fixture();
    buildPersonalKit(root, source, output, false);
    writeFileSync(
      join(output, "instalar.ps1"),
      "\uFEFF" + readFileSync(resolve(import.meta.dirname, "install-personal-kit.ps1"), "utf8"),
    );
    const received = join(root, "received.bin");
    const calls = join(root, "calls.txt");
    const runner = join(root, "run-test.ps1");
    writeFileSync(
      runner,
      `
$ErrorActionPreference = 'Stop'
if ($PSVersionTable.PSVersion.Major -ne 5) { throw 'This regression must run on Windows PowerShell 5.1.' }
Add-Type -OutputAssembly $env:KIT_TEST_ADB -OutputType ConsoleApplication -TypeDefinition @'
using System;
using System.IO;
public static class FakeAdb {
    public static int Main(string[] args) {
        string command = string.Join("|", args);
        File.AppendAllText(Environment.GetEnvironmentVariable("KIT_TEST_CALLS"), command + "\\n");
        string marker = Environment.GetEnvironmentVariable("KIT_TEST_MARKER");
        if (Array.IndexOf(args, "mktemp") >= 0) Console.WriteLine("/data/local/tmp/scriptorium-DEMO1234");
        int push = Array.IndexOf(args, "push");
        if (push >= 0) {
            File.Copy(args[push + 1], Environment.GetEnvironmentVariable("KIT_TEST_RECEIVED"), true);
            using (var output = new FileStream(Environment.GetEnvironmentVariable("KIT_TEST_RECEIVED"), FileMode.Append)) {
                if (Environment.GetEnvironmentVariable("KIT_TEST_CORRUPT") == "1") output.WriteByte(85);
            }
        }
        if (Array.IndexOf(args, "sha256sum") >= 0) {
            using (var input = File.OpenRead(Environment.GetEnvironmentVariable("KIT_TEST_RECEIVED")))
            using (var sha = System.Security.Cryptography.SHA256.Create())
                Console.WriteLine(BitConverter.ToString(sha.ComputeHash(input)).Replace("-", "").ToLowerInvariant() + "  package.part");
        }
        if (Array.IndexOf(args, "mv") >= 0) File.WriteAllText(marker, "ready");
        if (command.Contains("cat|files/active-content")) {
            if (!File.Exists(marker)) return 1;
            Console.WriteLine(new string('a', 64));
        }
        return 0;
    }
}
'@
& $env:KIT_TEST_INSTALLER -Adb $env:KIT_TEST_ADB -Serial DEMO
`,
    );
    const result = spawnSync("powershell.exe", ["-NoProfile", "-File", runner], {
      encoding: "utf8",
      timeout: 30000,
      env: {
        ...Object.fromEntries(
          Object.entries(process.env).filter(([key]) => key.toLowerCase() !== "psmodulepath"),
        ),
        PSModulePath: join(
          process.env["SystemRoot"] ?? "C:/Windows",
          "System32/WindowsPowerShell/v1.0/Modules",
        ),
        KIT_TEST_ADB: join(root, "fake-adb.exe"),
        KIT_TEST_INSTALLER: join(output, "instalar.ps1"),
        KIT_TEST_RECEIVED: received,
        KIT_TEST_MARKER: join(root, "activated"),
        KIT_TEST_CALLS: calls,
        KIT_TEST_CORRUPT: corrupted ? "1" : "0",
      },
    });
    if (corrupted) {
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("incompleta ou divergente");
      expect(readFileSync(calls, "utf8")).not.toContain("|mv|");
      expect(readFileSync(calls, "utf8")).not.toContain("am|start");
      return;
    }
    expect(result.status, result.stderr + result.stdout).toBe(0);
    expect(readFileSync(received)).toEqual(readFileSync(join(source, "acervo.scriptorium")));
    expect(result.stdout).toContain("Acervo confirmado");
    const commands = readFileSync(calls, "utf8");
    expect(commands).toContain("|push|");
    expect(commands).toContain("|chmod|700|");
    expect(commands).toContain("| run-as org.scriptorium.app dd");
    expect(commands).toContain("|rmdir|/data/local/tmp/scriptorium-DEMO1234");
    expect(commands).toContain("sha256sum");
    expect(commands).not.toContain("exec-in");
    expect(commands).not.toContain("uninstall");
  },
  40000,
);

it.skipIf(process.platform !== "win32")(
  "updates only the APK when the exact content id is already installed",
  () => {
    const { root, source, output } = fixture();
    buildPersonalKit(root, source, output, false);
    writeFileSync(
      join(output, "instalar.ps1"),
      "\uFEFF" + readFileSync(resolve(import.meta.dirname, "install-personal-kit.ps1"), "utf8"),
    );
    const calls = join(root, "adb-calls.txt");
    const adb = join(root, "fake-adb.ps1");
    const escaped = calls.replaceAll("'", "''");
    writeFileSync(
      adb,
      `Add-Content -LiteralPath '${escaped}' -Value ($args -join '|')
if (($args -join '|') -match 'cat\\|files/active-content') { Write-Output '${"a".repeat(64)}' }
exit 0
`,
    );
    const result = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        join(output, "instalar.ps1"),
        "-Adb",
        adb,
        "-Serial",
        "emulator-TEST",
      ],
      {
        encoding: "utf8",
        timeout: 30000,
        // The host may use PowerShell 7; this child must load Windows PowerShell 5.1 modules.
        env: {
          ...Object.fromEntries(
            Object.entries(process.env).filter(([key]) => key.toLowerCase() !== "psmodulepath"),
          ),
          PSModulePath: join(
            process.env["SystemRoot"] ?? "C:/Windows",
            "System32/WindowsPowerShell/v1.0/Modules",
          ),
        },
      },
    );
    expect(result.status, result.stderr + result.stdout).toBe(0);
    expect(result.stdout).toContain("sem reenviar os livros");
    const commands = readFileSync(calls, "utf8");
    expect(commands).toContain("install|-r");
    expect(commands).toContain("am|start");
    expect(commands).not.toContain("exec-in");
    expect(commands).not.toContain("mkdir");
    expect(commands).not.toContain("uninstall");
  },
  40000,
);
