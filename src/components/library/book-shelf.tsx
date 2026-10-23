import { useEffect, useRef, useState } from "react";
import type { PrivateDocument } from "../../lib/domain/private-document";
import {
  DOCUMENT_PROFILE_LABELS,
  type DocumentProfileKind,
} from "../../lib/domain/document-profile";
import {
  installationAvailable,
  installationFetch,
} from "../../lib/workspace-runtime/installation-client";

export function DocumentCover({ document }: { document: PrivateDocument }) {
  const ref = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<string>();
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    let active = true;
    let url: string | undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        void (async () => {
          if (!(await installationAvailable())) {
            if (active) setUnavailable(true);
            return;
          }
          const response = await installationFetch(`covers/${document.checksum}`);
          if (active) {
            url = URL.createObjectURL(await response.blob());
            setImage(url);
          }
        })().catch(() => {
          if (active) setUnavailable(true);
        });
      },
      { rootMargin: "100px" },
    );
    if (ref.current) observer.observe(ref.current);
    return () => {
      active = false;
      observer.disconnect();
      if (url) URL.revokeObjectURL(url);
    };
  }, [document.checksum]);
  return (
    <div
      ref={ref}
      className="relative flex aspect-[3/4] items-center justify-center overflow-hidden border border-border bg-muted/30 shadow-md"
    >
      {image ? (
        <img
          src={image}
          alt={`Primeira página de ${document.title}`}
          className="h-full w-full object-contain"
        />
      ) : (
        <div className="p-4 text-center">
          <p className="font-serif text-base leading-snug">{document.title}</p>
          <p className="mt-4 text-xs text-muted-foreground">
            {unavailable ? "Prévia indisponível" : "Carregando página original…"}
          </p>
        </div>
      )}
    </div>
  );
}
export interface ShelfEntry {
  document: PrivateDocument;
  profile: DocumentProfileKind;
}

/** The covers of the books, as on a shelf; each opens the book. */
export function BookShelf({ entries }: { entries: readonly ShelfEntry[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {entries.map(({ document, profile }) => (
        <a
          key={document.id}
          href={`/library/document/${encodeURIComponent(document.id)}`}
          className="group min-w-0 rounded-sm border-b border-border pb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="transition-transform duration-200 group-hover:-translate-y-1 group-hover:rotate-1 motion-reduce:transform-none">
            <DocumentCover document={document} />
          </div>
          <h3 className="mt-3 font-serif text-base leading-snug underline-offset-4 group-hover:underline">
            {document.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {DOCUMENT_PROFILE_LABELS[profile]} · {document.language ?? "idioma não identificado"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {document.textPageCount}/{document.pageCount} páginas pesquisáveis
          </p>
        </a>
      ))}
    </div>
  );
}
