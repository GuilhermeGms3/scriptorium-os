import { useState } from "react";
import {
  installationAvailable,
  installationFetch,
} from "../../lib/workspace-runtime/installation-client";
import { openBrowserMigrationSource } from "../../lib/workspace-runtime/workspace-database";
import { readBrowserOriginal } from "../../lib/private-documents/private-document-storage";
import { PrivateDocumentRepository } from "../../lib/repositories/private-document-repository";

export function InstallationMigration() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  return (
    <details className="m-5 border border-border p-4">
      <summary className="cursor-pointer font-medium">
        Transferir acervo deste navegador para a instalação
      </summary>
      <p className="my-3 max-w-3xl text-xs text-muted-foreground">
        Copia PDFs e o banco completo, incluindo páginas, ligações, revisões, traduções e Rastro. O
        original permanece intacto. Execute aqui, no navegador que contém os livros, com os
        processamentos pausados. O destino precisa estar vazio. Snapshots acima de 2 GiB não são
        aceitos; a exportação exige memória livre para o banco completo.
      </p>
      <button
        type="button"
        disabled={busy}
        className="border border-input px-3 py-2 text-xs disabled:opacity-50"
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            if (!(await installationAvailable()))
              throw new Error("Ative SCRIPTORIUM_WORKSPACE_DIR no servidor local antes de migrar.");
            setMessage("Abrindo o workspace original…");
            const source = await openBrowserMigrationSource();
            const running = await source.query(
              "SELECT 1 FROM pipeline_jobs WHERE status='running' UNION ALL SELECT 1 FROM document_knowledge_indexes WHERE status='processing' LIMIT 1",
            );
            if (running.length)
              throw new Error("Pause os processamentos antes de copiar o workspace.");
            const documents = await PrivateDocumentRepository.listDocuments(
              { limit: 1000 },
              source,
            );
            if (!documents.length) throw new Error("Este navegador não contém livros para migrar.");
            for (const [index, document] of documents.entries()) {
              setMessage(`Copiando PDF ${index + 1}/${documents.length}: ${document.title}`);
              const original = await readBrowserOriginal(document.checksum);
              await installationFetch(`documents/${document.checksum}`, {
                method: "PUT",
                body: original,
              });
            }
            setMessage("Exportando o banco completo sem alterar o original…");
            const snapshot = await source.exportSnapshot();
            for (let offset = 0; offset < snapshot.byteLength; offset += 4 * 1024 * 1024) {
              setMessage(`Copiando banco: ${Math.floor((offset / snapshot.byteLength) * 100)}%`);
              await installationFetch(`migration?offset=${offset}`, {
                method: "POST",
                body: new Blob([snapshot.slice(offset, offset + 4 * 1024 * 1024)]),
              });
            }
            await installationFetch(`migration?offset=${snapshot.byteLength}&finish=1`, {
              method: "POST",
            });
            setMessage(
              `${documents.length} livros transferidos com banco completo. Recarregue a página para usar a instalação.`,
            );
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : String(cause));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Transferindo…" : "Copiar acervo completo para a instalação"}
      </button>
      {message && (
        <p role="status" className="mt-3 text-xs">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-xs text-destructive">
          {error}
        </p>
      )}
    </details>
  );
}
