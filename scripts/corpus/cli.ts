import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import {
  TAGNT_OUTPUT_ROOT,
  acquireTagnt,
  assertTagntRights,
  verifyTagnt,
} from "./tagnt-acquisition";
import { importTagnt } from "./tagnt-import";
import type { CorpusPipeline, CorpusPipelineEvent, CorpusStatus } from "./pipeline";

const TAGNT_ID = "stepbible-tagnt";
const COMMANDS = ["list", "status", "acquire", "verify", "import", "build"] as const;
const FORCEABLE = new Set<Command>(["acquire", "import", "build"]);
const FLAGS = new Set(["--all", "--force", "--json", "--help", "-h"]);

type Command = (typeof COMMANDS)[number];

interface Invocation {
  command: Command;
  corpusIds: string[];
  all: boolean;
  force: boolean;
  json: boolean;
}

interface AcquisitionSummary {
  packageId: string;
  commitSha: string;
  artifacts: unknown[];
  packageDigest: { value: string };
}

type Handler = (corpusId: string, invocation: Invocation) => Promise<unknown>;

const USAGE = `Usage: npm run corpus:<command> -- [<corpus-id> | --all] [--force] [--json]

Commands:
  list               List the registered corpora.
  status <corpus>    Show rights, acquisition and dataset state with the reason.
  acquire <corpus>   Clone the pinned commit and install a verified snapshot atomically.
  verify <corpus>    Check every artifact (presence, size, SHA-256) and the package digest.
  import <corpus>    Generate chapter shards; an up-to-date dataset is reused.
  build <corpus>     acquire + import.

Options:
  --all     Run the command for every registered corpus.
  --force   import/build: regenerate an up-to-date dataset; acquire: replace the snapshot.
  --json    Print machine-readable JSON on stdout.
  --help    Show this help.

Exit codes: 0 success, 1 pipeline failure, 2 usage error.`;

class UsageError extends Error {}

function parseArguments(argv: string[]): Invocation | "help" {
  const flags = argv.filter((argument) => argument.startsWith("-"));
  const positional = argv.filter((argument) => !argument.startsWith("-"));
  for (const flag of flags) if (!FLAGS.has(flag)) throw new UsageError(`Unknown option ${flag}.`);
  if (flags.includes("--help") || flags.includes("-h")) return "help";
  const [command, ...corpusIds] = positional;
  if (!command) throw new UsageError("Missing command.");
  if (!COMMANDS.includes(command as Command)) throw new UsageError(`Unknown command: ${command}.`);
  const invocation: Invocation = {
    command: command as Command,
    corpusIds,
    all: flags.includes("--all"),
    force: flags.includes("--force"),
    json: flags.includes("--json"),
  };
  if (invocation.command === "list") {
    if (corpusIds.length || invocation.all) throw new UsageError("list takes no corpus id.");
  } else if (invocation.all ? corpusIds.length > 0 : corpusIds.length !== 1) {
    throw new UsageError(`${invocation.command} needs exactly one corpus id or --all.`);
  }
  if (invocation.force && !FORCEABLE.has(invocation.command))
    throw new UsageError("--force only applies to acquire, import and build.");
  return invocation;
}

function acquisitionSummary(result: AcquisitionSummary) {
  return {
    packageId: result.packageId,
    commitSha: result.commitSha,
    artifacts: result.artifacts.length,
    packageDigest: result.packageDigest,
  };
}

function textHandlers(pipeline: CorpusPipeline): Record<Exclude<Command, "list">, Handler> {
  return {
    status: (corpusId) => pipeline.status(corpusId),
    acquire: async (corpusId, { force }) =>
      acquisitionSummary(await pipeline.acquire(corpusId, { force })),
    verify: async (corpusId) => acquisitionSummary(await pipeline.verify(corpusId)),
    import: async (corpusId, { force }) => (await pipeline.import(corpusId, { force })).statistics,
    build: async (corpusId, { force }) => (await pipeline.build(corpusId, { force })).statistics,
  };
}

async function tagntStatus(): Promise<CorpusStatus> {
  let rights: CorpusStatus["rights"] = { eligible: true, reasons: [] };
  try {
    assertTagntRights();
  } catch (error) {
    rights = { eligible: false, reasons: [(error as Error).message] };
  }
  let acquisition: CorpusStatus["acquisition"];
  try {
    await verifyTagnt();
    acquisition = { state: "verified", reason: null };
  } catch (error) {
    acquisition =
      (error as NodeJS.ErrnoException).code === "ENOENT"
        ? { state: "missing", reason: "artifact-manifest.json not found" }
        : { state: "corrupt", reason: (error as Error).message };
  }
  let present = true;
  try {
    await stat(resolve(TAGNT_OUTPUT_ROOT, "manifest.json"));
  } catch {
    present = false;
  }
  return {
    corpusId: TAGNT_ID,
    registered: true,
    packageId: null,
    rights,
    acquisition,
    dataset: present
      ? { state: "up-to-date", reason: "presence only; the TAGNT importer checks alignment" }
      : { state: "missing", reason: "manifest.json not found" },
  };
}

const tagntHandlers: Record<Exclude<Command, "list">, Handler> = {
  status: () => tagntStatus(),
  acquire: async () => acquisitionSummary(await acquireTagnt()),
  verify: async () => acquisitionSummary(await verifyTagnt()),
  import: async () => (await importTagnt()).statistics,
  build: async () => {
    await acquireTagnt();
    return (await importTagnt()).statistics;
  },
};

function describe(command: Command, corpusId: string, result: unknown): string {
  if (command === "status") {
    const status = result as CorpusStatus;
    const reason = (value: string | null) => (value ? ` — ${value}` : "");
    return [
      `${corpusId}${status.packageId ? ` (${status.packageId})` : ""}`,
      `  registered:  ${status.registered ? "yes" : "no"}`,
      `  rights:      ${status.rights.eligible ? "eligible" : `blocked — ${status.rights.reasons.join(", ")}`}`,
      `  acquisition: ${status.acquisition.state}${reason(status.acquisition.reason)}`,
      `  dataset:     ${status.dataset.state}${reason(status.dataset.reason)}`,
    ].join("\n");
  }
  if (command === "acquire" || command === "verify") {
    const summary = result as ReturnType<typeof acquisitionSummary>;
    return `${corpusId}: ${summary.artifacts} artifacts verified @ ${summary.commitSha.slice(0, 12)} (digest ${summary.packageDigest.value.slice(0, 12)})`;
  }
  const statistics = result as Record<string, unknown>;
  const fields = ["books", "chapters", "verses", "tokenOccurrences", "targetTokens"]
    .filter((key) => typeof statistics[key] === "number")
    .map((key) => `${key} ${String(statistics[key])}`);
  return `${corpusId}: ${command} ok — ${fields.join(", ")}`;
}

function reportFailure(corpusId: string, error: unknown): void {
  const failure = error as Error & { code?: unknown; details?: unknown };
  const code = failure.name === "CorpusPipelineError" ? String(failure.code) : "error";
  process.stderr.write(`✗ ${corpusId}: [${code}] ${failure.message ?? String(error)}\n`);
  if (Array.isArray(failure.details))
    for (const detail of failure.details) process.stderr.write(`  - ${String(detail)}\n`);
}

async function main(argv: string[]): Promise<number> {
  let invocation: Invocation | "help";
  try {
    invocation = parseArguments(argv);
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    process.stderr.write(`${error.message}\n\n${USAGE}\n`);
    return 2;
  }
  if (invocation === "help") {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  const onlyTagnt = !invocation.all && invocation.corpusIds[0] === TAGNT_ID;
  if (onlyTagnt && invocation.force) {
    process.stderr.write(`--force is not supported for ${TAGNT_ID}.\n\n${USAGE}\n`);
    return 2;
  }
  // Acquisition/import of a linguistic package must not require its generated snapshot to exist.
  const textPipeline = onlyTagnt
    ? null
    : (await import("./pipeline")).createCorpusPipeline({
        onEvent: (event: CorpusPipelineEvent) =>
          process.stderr.write(`${event.type}: ${event.corpusId} — ${event.detail}\n`),
      });

  if (invocation.command === "list") {
    const corpora = [
      ...textPipeline!.list(),
      { corpusId: TAGNT_ID, packageId: null, adapterId: "tagnt", rightsEligible: true },
    ];
    process.stdout.write(
      invocation.json
        ? `${JSON.stringify(corpora, null, 2)}\n`
        : `${corpora
            .map((corpus) =>
              [
                corpus.corpusId.padEnd(18),
                String(corpus.packageId ?? "-").padEnd(42),
                String(corpus.adapterId ?? "-").padEnd(16),
                corpus.rightsEligible ? "eligible" : "blocked",
              ].join(" "),
            )
            .join("\n")}\n`,
    );
    return 0;
  }

  const corpusIds = invocation.all
    ? [...new Set(textPipeline!.list().map((corpus) => corpus.corpusId)), TAGNT_ID]
    : invocation.corpusIds;
  const results: { corpusId: string; result?: unknown; error?: unknown }[] = [];
  let failed = false;
  for (const corpusId of corpusIds) {
    const isTagnt = corpusId === TAGNT_ID;
    if (isTagnt && invocation.force) {
      process.stderr.write(`${TAGNT_ID}: --force ignored (the TAGNT import is idempotent).\n`);
    }
    const handler = (isTagnt ? tagntHandlers : textHandlers(textPipeline!))[invocation.command];
    try {
      const result = await handler(corpusId, invocation);
      results.push({ corpusId, result });
      if (!invocation.json)
        process.stdout.write(`${describe(invocation.command, corpusId, result)}\n`);
    } catch (error) {
      failed = true;
      reportFailure(corpusId, error);
      const failure = error as Error & { code?: unknown; details?: unknown };
      results.push({
        corpusId,
        error: {
          code: failure.code ?? "error",
          message: failure.message,
          details: failure.details ?? [],
        },
      });
    }
  }
  if (invocation.json) {
    const payload = invocation.all ? results : (results[0]?.result ?? results[0]?.error);
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  }
  return failed ? 1 : 0;
}

process.exitCode = await main(process.argv.slice(2));
