import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { bookLabel } from "../../src/lib/i18n";
import { fileHash, MobileManifestSchema, writeMobileArchive } from "./export-content";

/** Add installed desktop corpora without rebuilding/copying PDFs, comments or personal data. */
export function addCorpusEditions(options: {
  base: string;
  output: string;
  editions: string[];
  root?: string;
}) {
  const root = resolve(options.root ?? ".");
  const base = MobileManifestSchema.parse(JSON.parse(readFileSync(options.base, "utf8")));
  const registry = z
    .object({
      packages: z.array(
        z.object({
          editionId: z.string().regex(/^[a-z0-9][a-z0-9.-]{0,160}$/),
          title: z.string(),
          works: z.array(z.string()),
        }),
      ),
    })
    .parse(JSON.parse(readFileSync(join(root, "public/corpus-packages/registry.json"), "utf8")));
  const selected = [...new Set(options.editions)]
    .map((id) => {
      const entry = registry.packages.find((item) => item.editionId === id);
      if (!entry) throw new Error(`Edição indisponível: ${id}`);
      return entry;
    })
    .filter((entry) => !base.editions.some((item) => item.id === entry.editionId));
  if (!selected.length) throw new Error("Todas as edições pedidas já estão no manifesto-base.");
  const sources = new Map(
    selected.map((item) => [
      `corpus/${item.editionId}.sqlite3`,
      join(root, "public/corpus-packages", `${item.editionId}.sqlite3`),
    ]),
  );
  const additions = [...sources].map(([path, file]) => ({
    path,
    sha256: fileHash(file),
    size: statSync(file).size,
  }));
  if (additions.some((item) => base.files.some((old) => old.path === item.path)))
    throw new Error("O caminho da nova edição já existe no manifesto-base.");
  const files = [...base.files, ...additions].sort((a, b) => a.path.localeCompare(b.path));
  const editions = [
    ...base.editions,
    ...selected.map((item) => ({
      id: item.editionId,
      title: item.title,
      path: `corpus/${item.editionId}.sqlite3`,
    })),
  ];
  const bookLabels = { ...base.bookLabels };
  for (const entry of selected)
    for (const work of entry.works) {
      const id = work.replace(/^work:/, "");
      bookLabels[id] = bookLabel(id);
    }
  const id = createHash("sha256")
    .update(JSON.stringify({ files, editions, bookLabels, baseId: base.id }))
    .digest("hex");
  const manifest = MobileManifestSchema.parse({
    ...base,
    id,
    baseId: base.id,
    createdAt: new Date().toISOString(),
    files,
    editions,
    bookLabels,
  });
  const output = resolve(options.output);
  mkdirSync(output, { recursive: false });
  writeMobileArchive(join(output, "acervo.scriptorium"), manifest, sources, base);
  writeFileSync(join(output, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  return {
    id,
    baseId: base.id,
    addedEditions: selected.map((item) => item.editionId),
    addedBytes: additions.reduce((sum, item) => sum + item.size, 0),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const value = (name: string) => args[args.indexOf(name) + 1];
  if (!["--base", "--output", "--editions"].every((name) => args.includes(name) && value(name)))
    throw new Error("Use --base <manifest.json> --output <pasta-nova> --editions <id,id>.");
  console.log(
    JSON.stringify(
      addCorpusEditions({
        base: value("--base")!,
        output: value("--output")!,
        editions: value("--editions")!.split(","),
      }),
      null,
      2,
    ),
  );
}
