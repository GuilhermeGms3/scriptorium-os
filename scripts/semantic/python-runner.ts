import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

type Candidate = { command: string; prefix: string[] };

const root = resolve(import.meta.dirname, "../..");
const service = resolve(root, "services/semantic-engine");
const candidates: Candidate[] = [
  { command: resolve(service, ".venv/Scripts/python.exe"), prefix: [] },
  { command: resolve(service, ".venv/bin/python"), prefix: [] },
  { command: "py", prefix: ["-3.13"] },
  { command: "python3.13", prefix: [] },
  { command: "python3", prefix: [] },
  { command: "python", prefix: [] },
];

function available(candidate: Candidate): boolean {
  if (candidate.command.includes("/") || candidate.command.includes("\\")) {
    if (!existsSync(candidate.command)) return false;
  }
  const probe = spawnSync(
    candidate.command,
    [
      ...candidate.prefix,
      "-c",
      "import sys; raise SystemExit(0 if (3, 11) <= sys.version_info[:2] < (3, 14) else 1)",
    ],
    { cwd: service, stdio: "ignore", shell: false },
  );
  return probe.status === 0;
}

const python = candidates.find(available);
if (!python) {
  console.error(
    "Python 3.11–3.13 não encontrado. No Windows, confirme `py -3.13 --version`; depois rode `npm run semantic:install`.",
  );
  process.exit(1);
}

const action = process.argv[2] ?? "test";
const argumentsByAction: Record<string, string[]> = {
  install: ["-m", "pip", "install", "-e", ".[test]"],
  test: ["-m", "pytest", "tests", "-q"],
  dev: ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8018"],
};
const args = argumentsByAction[action];
if (!args) {
  console.error(`Ação semântica desconhecida: ${action}`);
  process.exit(2);
}
const result = spawnSync(python.command, [...python.prefix, ...args], {
  cwd: service,
  stdio: "inherit",
  shell: false,
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
