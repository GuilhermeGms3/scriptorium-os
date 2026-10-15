import { useState } from "react";
import type { NagHammadiTractate } from "../../lib/content/nag-hammadi-catalog";
import { PrivateDocumentRepository } from "../../lib/repositories/private-document-repository";
import type { PrivateDocumentSearchHit } from "../../lib/domain/private-document";

/** Editorial search aliases, not assertions that a volume/page is the requested codex witness. */
const SPANISH_TITLES: Record<string, string> = {
  "prayer-apostle-paul": "Oración Pablo",
  "apocryphon-james": "Apócrifo Santiago",
  "gospel-truth": "Evangelio Verdad",
  "treatise-resurrection": "Tratado Resurrección",
  "tripartite-tractate": "Tratado Tripartito",
  "apocryphon-john": "Apócrifo Juan",
  "gospel-thomas": "Evangelio Tomás",
  "gospel-philip": "Evangelio Felipe",
  "hypostasis-archons": "Hipóstasis Arcontes",
  "origin-world": "Origen Mundo",
  "exegesis-soul": "Exégesis Alma",
  "book-thomas-contender": "Libro Tomás",
  "gospel-egyptians": "Evangelio Egipcios",
  eugnostos: "Eugnosto",
  "sophia-jesus-christ": "Sabiduría Jesucristo",
  "dialogue-savior": "Diálogo Salvador",
  "apocalypse-paul": "Apocalipsis Pablo",
  "first-apocalypse-james": "Apocalipsis Santiago",
  "second-apocalypse-james": "Apocalipsis Santiago",
  "apocalypse-adam": "Apocalipsis Adán",
  "acts-peter-twelve": "Hechos Pedro",
  "thunder-perfect-mind": "Trueno Mente",
  "authoritative-teaching": "Enseñanza Autorizada",
  "concept-great-power": "Gran Potencia",
  "plato-republic-excerpt": "República Platón",
  "eighth-ninth": "Ogdoada Enéada",
  "prayer-thanksgiving": "Oración Acción Gracias",
  "asclepius-21-29": "Asclepio",
  "paraphrase-shem": "Paráfrasis Sem",
  "second-treatise-great-seth": "Segundo Tratado Set",
  "apocalypse-peter": "Apocalipsis Pedro",
  "teachings-silvanus": "Enseñanzas Silvano",
  "three-steles-seth": "Estelas Set",
  zostrianos: "Zostriano",
  "letter-peter-philip": "Carta Pedro Felipe",
  melchizedek: "Melquisedec",
  "thought-norea": "Pensamiento Norea",
  "testimony-truth": "Testimonio Verdad",
  marsanes: "Marsanes",
  "interpretation-knowledge": "Interpretación Conocimiento",
  "valentinian-exposition": "Exposición Valentiniana",
  allogenes: "Alógenes",
  hypsiphrone: "Hipsifrona",
  "sentences-sextus": "Sentencias Sexto",
  "nhc-xii-fragments": "Fragmentos",
  "trimorphic-protennoia": "Protennoia Trimorfa",
};
export function NagHammadiLocator({ tractate }: { tractate: NagHammadiTractate }) {
  const [hits, setHits] = useState<PrivateDocumentSearchHit[]>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <details className="mt-1 text-xs">
      <summary
        className="cursor-pointer underline underline-offset-4"
        onClick={() => {
          if (hits || busy) return;
          setBusy(true);
          void (async () => {
            const books = (await PrivateDocumentRepository.listDocuments()).filter((book) =>
              /nag[\s_-]*hammadi/iu.test(book.title),
            );
            const query = SPANISH_TITLES[tractate.workKey] ?? tractate.title;
            const results = await Promise.all(
              books.map((book) =>
                PrivateDocumentRepository.search(query, { documentId: book.id, limit: 3 }),
              ),
            );
            setHits(results.flat());
          })()
            .catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)))
            .finally(() => setBusy(false));
        }}
      >
        {tractate.order}. {tractate.title} · localizar nos volumes
      </summary>
      {busy && <p className="py-2 text-muted-foreground">Consultando páginas indexadas…</p>}
      {error && (
        <p role="alert" className="py-2 text-destructive">
          {error}
        </p>
      )}
      {hits && !hits.length && (
        <p className="py-2 text-muted-foreground">
          Não foi localizada uma ocorrência pesquisável do título. Isso não comprova ausência do
          tratado; abra o volume pelo acervo para consultar seu índice.
        </p>
      )}
      {hits && hits.length > 0 && (
        <>
          <p className="my-2 text-xs text-muted-foreground">
            Ocorrências do título, não limites confirmados do tratado nem alinhamento entre códices.
          </p>
          <ul className="space-y-3">
            {hits.map((hit) => (
              <li key={`${hit.documentId}:${hit.pageIndex}`}>
                <a
                  className="underline underline-offset-4 text-primary"
                  href={`/library/document/${encodeURIComponent(hit.documentId)}?page=${hit.pageIndex + 1}`}
                >
                  {hit.title} · p. {hit.pageLabel}
                </a>
                <p className="mt-1 text-muted-foreground">{hit.snippet}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </details>
  );
}
