import { spawnSync } from "node:child_process";
import {
  closeSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  statSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Zip, ZipDeflate } from "fflate";
import { MobileManifestSchema, fileHash } from "./export-content";

export function buildPersonalKit(
  root: string,
  packageDirectory: string,
  output: string,
  build = true,
): void {
  const source = resolve(packageDirectory);
  const destination = resolve(output);
  if (existsSync(destination))
    throw new Error("Escolha uma pasta nova para o kit. Nada foi sobrescrito.");
  const manifest = MobileManifestSchema.parse(
    JSON.parse(readFileSync(join(source, "manifest.json"), "utf8")) as unknown,
  );
  const content = join(source, "acervo.scriptorium");
  if (!statSync(content).isFile()) throw new Error("Pacote de acervo ausente.");
  if (process.env["CI"]) throw new Error("Não gere kits com acervo privado no CI público.");
  if (build) {
    const environment = { ...process.env };
    if (
      !environment["ANDROID_HOME"] &&
      !environment["ANDROID_SDK_ROOT"] &&
      environment["LOCALAPPDATA"]
    ) {
      const sdk = join(environment["LOCALAPPDATA"], "Android/Sdk");
      if (existsSync(join(sdk, "platform-tools/adb.exe"))) environment["ANDROID_HOME"] = sdk;
    }
    const result =
      process.platform === "win32"
        ? spawnSync(
            "cmd.exe",
            ["/d", "/s", "/c", "gradlew.bat :app:clean :app:assembleDebug --console=plain"],
            { cwd: join(root, "android"), stdio: "inherit", env: environment },
          )
        : spawnSync("./gradlew", [":app:clean", ":app:assembleDebug", "--console=plain"], {
            cwd: join(root, "android"),
            stdio: "inherit",
            env: environment,
          });
    if (result.error || result.status !== 0)
      throw new Error("A compilação Android falhou; o acervo original não foi alterado.", {
        cause: result.error,
      });
  }
  const apk = join(root, "android/app/build/outputs/apk/debug/app-debug.apk");
  if (statSync(apk).size > 512 * 1024 * 1024)
    throw new Error(
      "O APK ainda contém um acervo grande. Compile sem scriptoriumContentPack antes de gerar o kit.",
    );
  mkdirSync(destination, { recursive: false });
  copyFileSync(apk, join(destination, "Scriptorium.apk"));
  copyFileSync(content, join(destination, "acervo.scriptorium"));
  copyFileSync(join(source, "manifest.json"), join(destination, "manifest.json"));
  writeFileSync(
    join(destination, "instalar.ps1"),
    "\uFEFF" + readFileSync(join(root, "scripts/mobile/install-personal-kit.ps1"), "utf8"),
  );
  const description = {
    format: "scriptorium-private-kit-v1",
    id: manifest.id,
    apkSha256: fileHash(apk),
    packageSha256: fileHash(content),
    pdfCount: manifest.files.filter((file) => file.path.endsWith(".pdf")).length,
    editionCount: manifest.editions.length,
  };
  writeFileSync(join(destination, "delivery.json"), JSON.stringify(description, null, 2));
  writeFileSync(
    join(destination, "LEIA-ME.md"),
    `# Scriptorium — kit pessoal completo\n\nEste kit contém o aplicativo e todo o acervo: ${description.pdfCount} PDFs originais e ${description.editionCount} edições. Extraia todos os arquivos antes de instalar. Não publique este kit.\n\n## Instalação automática por USB\n\nSalve suas notas. Ative a depuração USB e autorize seu próprio PC no aparelho. Com as Platform Tools oficiais instaladas, execute nesta pasta:\n\n\`\`\`powershell\n.\\instalar.ps1\n# Se houver mais de um aparelho: .\\instalar.ps1 -Serial IDENTIFICADOR\n\`\`\`\n\nO instalador confere hashes, atualiza sem desinstalar, transfere o pacote inteiro e aguarda sua ativação no aplicativo. Reserve 8 GB livres. Não feche o aplicativo durante a primeira preparação. O APK sozinho não contém os livros: ambos são entregues juntos por este instalador.\n\nSem ADB: instale Scriptorium.apk, copie acervo.scriptorium para o telefone e selecione-o uma única vez em Mais → Pacotes. Isso importa o acervo inteiro, não cada livro.\n\nNotas e progresso ficam no aparelho, protegidos de atualizações de conteúdo. Exporte um backup em Mais → Ajustes e backup. Não desinstale para atualizar.\n\nA busca por sentido ainda é experimental e tem um gate de relevância pendente. Tradução usa ML Kit local, com download inicial explícito de idioma. Não há produção/OCR/LLM no celular. Versão preview; consulte a matriz de paridade do repositório.\n`,
  );
  const fd = openSync(join(destination, "Scriptorium-completo.zip"), "wx");
  const zip = new Zip((error, bytes) => {
    if (error) throw error;
    writeSync(fd, bytes);
  });
  try {
    for (const name of [
      "LEIA-ME.md",
      "delivery.json",
      "manifest.json",
      "instalar.ps1",
      "Scriptorium.apk",
      "acervo.scriptorium",
    ]) {
      const input = openSync(join(destination, name), "r");
      try {
        const entry = new ZipDeflate(name, { level: 0 });
        zip.add(entry);
        const buffer = Buffer.alloc(1024 * 1024);
        let size: number;
        while ((size = readSync(input, buffer, 0, buffer.length, null)))
          entry.push(buffer.subarray(0, size));
        entry.push(new Uint8Array(), true);
      } finally {
        closeSync(input);
      }
    }
    zip.end();
  } finally {
    closeSync(fd);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const value = (key: string) => {
    const index = args.indexOf(key);
    return index >= 0 ? args[index + 1] : undefined;
  };
  const source = value("--package");
  const output = value("--output");
  if (!source || !output)
    throw new Error("Use --package <pasta-exportada> --output <pasta-nova-do-kit>.");
  buildPersonalKit(resolve(import.meta.dirname, "../.."), source, output);
  console.log(
    "Kit privado completo gerado. Extraia e execute instalar.ps1; não publique os livros.",
  );
}
