export type NagHammadiTextAvailability = "installed-source-text" | "catalog-only";

export const NAG_HAMMADI_CATALOG_PROVENANCE = {
  inventorySource: "The Gnostic Society Library — Nag Hammadi Library Codex Index",
  inventoryUrl: "https://gnosis.org/naghamm/nhlcodex.html",
  checkedAt: "2026-09-25",
  labelLanguage: "pt-BR",
  note: "Portuguese titles are Scriptorium editorial labels; canonical English titles remain preserved.",
} as const;

export interface NagHammadiTractate {
  id: string;
  codex: number;
  order: number;
  title: string;
  canonicalTitle: string;
  workKey: string;
  availability: NagHammadiTextAvailability;
  installedWorkId?: string;
}

const tractate = (
  codex: number,
  order: number,
  title: string,
  canonicalTitle: string,
  workKey: string,
  installedWorkId?: string,
): NagHammadiTractate => ({
  id: `nhc-${String(codex).padStart(2, "0")}-${String(order).padStart(2, "0")}`,
  codex,
  order,
  title,
  canonicalTitle,
  workKey,
  availability: installedWorkId ? "installed-source-text" : "catalog-only",
  ...(installedWorkId ? { installedWorkId } : {}),
});

export const NAG_HAMMADI_CATALOG: readonly NagHammadiTractate[] = [
  tractate(1, 1, "Oração do Apóstolo Paulo", "Prayer of the Apostle Paul", "prayer-apostle-paul"),
  tractate(1, 2, "Apócrifo de Tiago", "Apocryphon of James", "apocryphon-james"),
  tractate(1, 3, "Evangelho da Verdade", "Gospel of Truth", "gospel-truth"),
  tractate(
    1,
    4,
    "Tratado sobre a Ressurreição",
    "Treatise on the Resurrection",
    "treatise-resurrection",
  ),
  tractate(1, 5, "Tratado Tripartido", "Tripartite Tractate", "tripartite-tractate"),
  tractate(2, 1, "Apócrifo de João", "Apocryphon of John", "apocryphon-john"),
  tractate(
    2,
    2,
    "Evangelho de Tomé",
    "Gospel of Thomas",
    "gospel-thomas",
    "work:gospel-thomas-coptic",
  ),
  tractate(2, 3, "Evangelho de Filipe", "Gospel of Philip", "gospel-philip"),
  tractate(2, 4, "Hipóstase dos Arcontes", "Hypostasis of the Archons", "hypostasis-archons"),
  tractate(2, 5, "Sobre a Origem do Mundo", "On the Origin of the World", "origin-world"),
  tractate(2, 6, "Exegese da Alma", "Exegesis on the Soul", "exegesis-soul"),
  tractate(
    2,
    7,
    "Livro de Tomé, o Contendor",
    "Book of Thomas the Contender",
    "book-thomas-contender",
  ),
  tractate(3, 1, "Apócrifo de João", "Apocryphon of John", "apocryphon-john"),
  tractate(
    3,
    2,
    "Evangelho dos Egípcios",
    "Holy Book of the Great Invisible Spirit",
    "gospel-egyptians",
  ),
  tractate(3, 3, "Eugnosto, o Bem-aventurado", "Eugnostos the Blessed", "eugnostos"),
  tractate(3, 4, "Sabedoria de Jesus Cristo", "Sophia of Jesus Christ", "sophia-jesus-christ"),
  tractate(3, 5, "Diálogo do Salvador", "Dialogue of the Savior", "dialogue-savior"),
  tractate(4, 1, "Apócrifo de João", "Apocryphon of John", "apocryphon-john"),
  tractate(
    4,
    2,
    "Evangelho dos Egípcios",
    "Holy Book of the Great Invisible Spirit",
    "gospel-egyptians",
  ),
  tractate(5, 1, "Eugnosto, o Bem-aventurado", "Eugnostos the Blessed", "eugnostos"),
  tractate(5, 2, "Apocalipse de Paulo", "Apocalypse of Paul", "apocalypse-paul"),
  tractate(
    5,
    3,
    "Primeiro Apocalipse de Tiago",
    "First Apocalypse of James",
    "first-apocalypse-james",
  ),
  tractate(
    5,
    4,
    "Segundo Apocalipse de Tiago",
    "Second Apocalypse of James",
    "second-apocalypse-james",
  ),
  tractate(5, 5, "Apocalipse de Adão", "Apocalypse of Adam", "apocalypse-adam"),
  tractate(
    6,
    1,
    "Atos de Pedro e dos Doze Apóstolos",
    "Acts of Peter and the Twelve Apostles",
    "acts-peter-twelve",
  ),
  tractate(6, 2, "O Trovão, Mente Perfeita", "The Thunder, Perfect Mind", "thunder-perfect-mind"),
  tractate(6, 3, "Ensinamento Autorizado", "Authoritative Teaching", "authoritative-teaching"),
  tractate(
    6,
    4,
    "Conceito de Nosso Grande Poder",
    "Concept of Our Great Power",
    "concept-great-power",
  ),
  tractate(
    6,
    5,
    "A República de Platão 588a–589b",
    "Plato, Republic 588a–589b",
    "plato-republic-excerpt",
  ),
  tractate(
    6,
    6,
    "Discurso sobre a Oitava e a Nona",
    "Discourse on the Eighth and Ninth",
    "eighth-ninth",
  ),
  tractate(6, 7, "Oração de Ação de Graças", "Prayer of Thanksgiving", "prayer-thanksgiving"),
  tractate(6, 8, "Asclépio 21–29", "Asclepius 21–29", "asclepius-21-29"),
  tractate(7, 1, "Paráfrase de Sem", "Paraphrase of Shem", "paraphrase-shem"),
  tractate(
    7,
    2,
    "Segundo Tratado do Grande Sete",
    "Second Treatise of the Great Seth",
    "second-treatise-great-seth",
  ),
  tractate(7, 3, "Apocalipse de Pedro", "Apocalypse of Peter", "apocalypse-peter"),
  tractate(7, 4, "Ensinamentos de Silvano", "Teachings of Silvanus", "teachings-silvanus"),
  tractate(7, 5, "Três Estelas de Sete", "Three Steles of Seth", "three-steles-seth"),
  tractate(8, 1, "Zostrianos", "Zostrianos", "zostrianos"),
  tractate(8, 2, "Carta de Pedro a Filipe", "Letter of Peter to Philip", "letter-peter-philip"),
  tractate(9, 1, "Melquisedeque", "Melchizedek", "melchizedek"),
  tractate(9, 2, "Pensamento de Norea", "Thought of Norea", "thought-norea"),
  tractate(9, 3, "Testemunho da Verdade", "Testimony of Truth", "testimony-truth"),
  tractate(10, 1, "Marsanes", "Marsanes", "marsanes"),
  tractate(
    11,
    1,
    "Interpretação do Conhecimento",
    "Interpretation of Knowledge",
    "interpretation-knowledge",
  ),
  tractate(11, 2, "Exposição Valentiniana", "Valentinian Exposition", "valentinian-exposition"),
  tractate(11, 3, "Alógenes", "Allogenes", "allogenes"),
  tractate(11, 4, "Hipsífrone", "Hypsiphrone", "hypsiphrone"),
  tractate(12, 1, "Sentenças de Sexto", "Sentences of Sextus", "sentences-sextus"),
  tractate(12, 2, "Evangelho da Verdade", "Gospel of Truth", "gospel-truth"),
  tractate(12, 3, "Fragmentos", "Fragments", "nhc-xii-fragments"),
  tractate(13, 1, "Protenoia Trimórfica", "Trimorphic Protennoia", "trimorphic-protennoia"),
  tractate(13, 2, "Sobre a Origem do Mundo", "On the Origin of the World", "origin-world"),
] as const;

export const NAG_HAMMADI_CODICES = Array.from({ length: 13 }, (_, index) => {
  const codex = index + 1;
  return {
    codex,
    tractates: NAG_HAMMADI_CATALOG.filter((item) => item.codex === codex),
  };
});

export const NAG_HAMMADI_RIGHTS_NOTE =
  "O catálogo é informativo. O texto copta instalado é CC BY 4.0 e não contém tradução. Traduções portuguesas modernas só podem entrar como documentos privados do usuário ou mediante licença explícita.";
