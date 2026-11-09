export interface ExternalResearchLink {
  id: string;
  title: string;
  description: string;
  url: string;
  category: "general" | "academic" | "library";
}
/** Explicit outbound navigation only. No crawling, iframes, or fabricated portal results. */
export function externalResearchLinks(query: string): ExternalResearchLink[] {
  const term = query.trim().slice(0, 240);
  if (term.length < 2) return [];
  const google = (q: string) => {
    const url = new URL("https://www.google.com/search");
    url.search = new URLSearchParams({ q }).toString();
    return url.href;
  };
  const scholar = new URL("https://scholar.google.com/scholar");
  scholar.search = new URLSearchParams({ hl: "pt-BR", q: term }).toString();
  const scielo = new URL("https://search.scielo.org/");
  scielo.search = new URLSearchParams({ q: term, lang: "pt" }).toString();
  const bdtd = new URL("https://bdtd.ibict.br/vufind/Search/Results");
  bdtd.search = new URLSearchParams({ lookfor: term, type: "AllFields" }).toString();
  return [
    {
      id: "google",
      title: "Google",
      description: "Pesquisa geral na internet",
      url: google(term),
      category: "general",
    },
    {
      id: "scholar",
      title: "Google Acadêmico",
      description: "Pesquisa no site do Google Acadêmico",
      url: scholar.href,
      category: "academic",
    },
    {
      id: "scielo",
      title: "SciELO",
      description: "Artigos e periódicos científicos",
      url: scielo.href,
      category: "academic",
    },
    {
      id: "bdtd",
      title: "BDTD / IBICT",
      description: "Teses e dissertações brasileiras",
      url: bdtd.href,
      category: "academic",
    },
    ...[
      ["usp", "USP", "Teses da Universidade de São Paulo", "site:teses.usp.br"],
      ["unb", "UnB", "Repositório da Universidade de Brasília", "site:repositorio.unb.br"],
      ["harvard", "Harvard DASH", "Repositório institucional de Harvard", "site:dash.harvard.edu"],
      [
        "frankfurt",
        "Universidade de Frankfurt",
        "Publicações no repositório institucional",
        "site:publikationen.ub.uni-frankfurt.de",
      ],
      ["archive", "Internet Archive", "Livros e acervos digitalizados", "site:archive.org"],
    ].map(([id, title, description, site]) => ({
      id: id!,
      title: title!,
      description: `${description} · via Google`,
      url: google(`${site} ${term}`),
      category: "library" as const,
    })),
  ];
}
