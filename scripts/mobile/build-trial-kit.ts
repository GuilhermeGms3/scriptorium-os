import { spawnSync } from "node:child_process";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { join, parse, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { buildPersonalKit } from "./build-personal-kit";

function buildTrialKit(root: string, packageDirectory: string, output: string): void {
  if (process.env["CI"]) throw new Error("Não gere kits privados no CI público.");
  const source = resolve(packageDirectory);
  const tempRoot = resolve(tmpdir()) + sep;
  if (
    !source.startsWith(tempRoot) ||
    !parse(source).base.startsWith("mobile-trial-") ||
    parse(source).root.toLowerCase() === parse(resolve(output)).root.toLowerCase()
  )
    throw new Error(
      "Use uma exportação nova mobile-trial-* na pasta temporária do Windows e entregue em outro disco.",
    );
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
      ? spawnSync("cmd.exe", ["/d", "/s", "/c", "gradlew.bat :app:assembleTrial --console=plain"], {
          cwd: join(root, "android"),
          stdio: "inherit",
          env: environment,
        })
      : spawnSync("./gradlew", [":app:assembleTrial", "--console=plain"], {
          cwd: join(root, "android"),
          stdio: "inherit",
          env: environment,
        });
  if (result.error || result.status !== 0)
    throw new Error("A compilação da variante de 30 dias falhou.", { cause: result.error });

  const apk = join(root, "android/app/build/outputs/apk/trial/app-trial.apk");
  buildPersonalKit(root, source, output, false, apk, 30, false, true, "org.scriptorium.app.trial");

  const destination = resolve(output);
  writeFileSync(
    join(destination, "LEIA-ME.txt"),
    "Scriptorium com acesso por 30 dias. Envie juntos Scriptorium.apk e acervo.scriptorium.\n" +
      "A pessoa instala o APK, abre o app com internet para ativar e importa o acervo pelo seletor de arquivos.\n",
  );
  rmSync(source, { recursive: true, force: true });
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
    throw new Error(
      "Use --package <pasta-temporaria-mobile-trial-*> --output <pasta-nova-no-disco-F>.",
    );
  buildTrialKit(resolve(import.meta.dirname, "../.."), source, output);
  console.log("Kit de 30 dias criado. Envie Scriptorium.apk e acervo.scriptorium juntos.");
}
