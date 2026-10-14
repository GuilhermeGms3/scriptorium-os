import { useEffect, useRef, useState } from "react";
import type { PrivateDocument } from "../../lib/domain/private-document";
import {
  DOCUMENT_PROFILE_LABELS,
  type DocumentProfileKind,
} from "../../lib/domain/document-profile";
import { classifyDocumentProfile } from "../../lib/application/document-profile-classifier";
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
          <p className="mt-4 text-[10px] text-muted-foreground">
            {unavailable ? "Prévia indisponível" : "Carregando página original…"}
          </p>
        </div>
      )}
    </div>
  );
}
export function BookShelf({ documents }: { documents: PrivateDocument[] }) {
  const [profile, setProfile] = useState<DocumentProfileKind | "all">("all");
  const entries = documents.map((document) => ({
    document,
    profile: classifyDocumentProfile(document.title).profile,
  }));
  const kinds = [...new Set(entries.map((entry) => entry.profile))];
  const shown = profile === "all" ? entries : entries.filter((entry) => entry.profile === profile);
  return (
    <div className="mt-4">
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        Organizar estante
        <select
          value={profile}
          onChange={(event) => setProfile(event.target.value as DocumentProfileKind | "all")}
          className="h-9 border border-input bg-background px-2 text-foreground"
        >
          <option value="all">Todas as áreas · {documents.length}</option>
          {kinds.map((kind) => (
            <option key={kind} value={kind}>
              {DOCUMENT_PROFILE_LABELS[kind]}
            </option>
          ))}
        </select>
      </label>
      <p className="mt-2 text-[10px] text-muted-foreground">
        Prévias das páginas reais. Agrupamento sugerido pelo título; confirme o perfil dentro do
        livro.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {shown.map(({ document, profile: kind }) => (
          <a
            key={document.id}
            href={`/library/document/${encodeURIComponent(document.id)}`}
            className="group min-w-0 border-b border-border pb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="transition-transform duration-200 group-hover:-translate-y-1 group-hover:rotate-1 motion-reduce:transform-none">
              <DocumentCover document={document} />
            </div>
            <h3 className="mt-3 font-serif text-sm leading-snug underline-offset-4 group-hover:underline">
              {document.title}
            </h3>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {DOCUMENT_PROFILE_LABELS[kind]} · {document.language ?? "idioma não identificado"}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {document.textPageCount}/{document.pageCount} páginas pesquisáveis
            </p>
          </a>
        ))}
      </div>
      {!shown.length && (
        <p className="py-6 text-sm text-muted-foreground">Nenhum livro neste filtro.</p>
      )}
    </div>
  );
}
