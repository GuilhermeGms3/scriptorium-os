import { useEffect, useState } from "react";
import {
  installationAvailable,
  installationFetch,
} from "../../lib/workspace-runtime/installation-client";

/** Authenticated local page image. The URL is never persisted in a note. */
export function SourcePagePreview({
  documentId,
  page,
  caption,
}: {
  documentId: string;
  page: number;
  caption: string;
}) {
  const [image, setImage] = useState<string>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let url: string | undefined;
    const abort = new AbortController();
    setImage(undefined);
    setFailed(false);
    void (async () => {
      const checksum = /^private-document:([a-f0-9]{64})$/u.exec(documentId)?.[1];
      if (!checksum || !(await installationAvailable()))
        throw new Error("Prévia requer instalação local.");
      const response = await installationFetch(`covers/${checksum}?page=${page}`, {
        signal: abort.signal,
      });
      if (!response.ok) throw new Error("Página indisponível.");
      const blob = await response.blob();
      if (!active) return;
      url = URL.createObjectURL(blob);
      setImage(url);
    })().catch(() => {
      if (active) setFailed(true);
    });
    return () => {
      active = false;
      abort.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [documentId, page]);
  return image ? (
    <img
      src={image}
      alt={`${caption} — página original ${page}`}
      className="mt-2 h-auto w-full rounded border border-border"
    />
  ) : (
    <p className="mt-2 text-xs text-muted-foreground" role="status">
      {failed
        ? "Prévia indisponível. O texto extraído e o acesso à Biblioteca continuam disponíveis."
        : "Carregando página original…"}
    </p>
  );
}
