import { acquireTagnt, verifyTagnt } from "./tagnt-acquisition";
import { importTagnt } from "./tagnt-import";

const [command, corpusId, ...extra] = process.argv.slice(2);

if (!command || !corpusId || extra.length > 0) {
  throw new Error("Usage: npm run corpus:<acquire|verify|import|build> -- <registered-corpus-id>");
}
// Acquisition/import of a linguistic package must not require its generated snapshot to exist.
const textPipeline = corpusId === "stepbible-tagnt" ? null : await import("./pipeline");

const result =
  corpusId === "stepbible-tagnt"
    ? command === "acquire"
      ? await acquireTagnt()
      : command === "verify"
        ? await verifyTagnt()
        : command === "import"
          ? await importTagnt()
          : command === "build"
            ? (await acquireTagnt(), await importTagnt())
            : null
    : command === "acquire"
      ? await textPipeline!.acquireCorpus(corpusId)
      : command === "verify"
        ? await textPipeline!.verifyCorpus(corpusId)
        : command === "import"
          ? await textPipeline!.importCorpus(corpusId)
          : command === "build"
            ? await textPipeline!.buildCorpus(corpusId)
            : null;

if (!result) throw new Error(`Unknown corpus command: ${command}.`);

if ("statistics" in result) {
  process.stdout.write(`${JSON.stringify(result.statistics, null, 2)}\n`);
} else {
  process.stdout.write(
    `${JSON.stringify(
      {
        packageId: result.packageId,
        commitSha: result.commitSha,
        artifacts: result.artifacts.length,
        packageDigest: result.packageDigest,
      },
      null,
      2,
    )}\n`,
  );
}
