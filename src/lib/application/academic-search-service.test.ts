import { afterEach, describe, expect, it, vi } from "vitest";
import {
  academicSearchUrl,
  AcademicSearchService,
  parseAcademicPage,
} from "./academic-search-service";
import { externalResearchLinks } from "./external-research-links";
import { publicAcademicUrl, type AcademicQuery } from "../domain/academic-search";

const work = {
  id: "https://openalex.org/W123456789",
  display_name: "DEMO — contexto bíblico",
  doi: "https://doi.org/10.1234/demo",
  publication_year: 2020,
  language: "pt",
  type: "article",
  authorships: [
    {
      author: { display_name: "Autor DEMO" },
      institutions: [{ display_name: "Instituição DEMO" }],
    },
  ],
  primary_location: {
    landing_page_url: "https://example.org/article",
    source: { display_name: "Revista DEMO" },
  },
  open_access: { is_oa: true, oa_url: "https://example.org/article.pdf" },
};
const payload = { meta: { count: 1 }, results: [work] };
const input = (query: string): AcademicQuery => ({
  query,
  language: "all",
  openAccessOnly: false,
  page: 1,
});
afterEach(() => vi.restoreAllMocks());
describe("busca acadêmica explícita", () => {
  it("builds fixed-host queries with encoded text and validated filters", () => {
    const url = academicSearchUrl({
      ...input("Gênesis & filter=malicious"),
      language: "pt",
      openAccessOnly: true,
      fromYear: 1990,
      toYear: 2024,
      page: 2,
    });
    expect(url.origin).toBe("https://api.openalex.org");
    expect(url.searchParams.get("search")).toBe("Gênesis & filter=malicious");
    expect(url.searchParams.get("filter")).toBe(
      "language:pt,is_oa:true,publication_year:1990-2024",
    );
    expect(url.searchParams.get("page")).toBe("2");
    expect(() =>
      academicSearchUrl({ ...input("Inválida"), fromYear: 2024, toYear: 1900 }),
    ).toThrow();
    expect(() => academicSearchUrl(input("a"))).toThrow();
    expect(() => academicSearchUrl({ ...input("Tema"), page: 11 })).toThrow();
  });
  it("maps real provider fields without inventing full text, drops malformed entries and duplicates", () => {
    const result = parseAcademicPage(
      { meta: { count: 3 }, results: [work, work, { id: "wrong" }] },
      1,
    );
    expect(result.items).toHaveLength(1);
    expect(result.skipped).toBe(1);
    expect(result.items[0]).toMatchObject({
      kind: "external-academic",
      authors: ["Autor DEMO"],
      institutions: ["Instituição DEMO"],
      doi: "10.1234/demo",
      url: work.id,
      openAccess: true,
      openAccessUrl: work.open_access.oa_url,
    });
    expect(result.items[0]).not.toHaveProperty("fullText");
    const unsafe = parseAcademicPage(
      {
        meta: { count: 1 },
        results: [
          {
            ...work,
            primary_location: { landing_page_url: "javascript:alert(1)" },
            open_access: { is_oa: true, oa_url: "http://127.0.0.1/private" },
          },
        ],
      },
      1,
    ).items[0];
    expect(unsafe?.originalUrl).toBeUndefined();
    expect(unsafe?.openAccessUrl).toBeUndefined();
  });
  it("does not navigate to unsafe protocols, credentials or private hosts", () => {
    for (const url of [
      "javascript:alert(1)",
      "file:///C:/private",
      "https://user:pass@example.org",
      "http://localhost/a",
      "http://192.168.1.1",
      "http://[::1]",
      "http://10.1.1.1",
    ])
      expect(publicAcademicUrl(url)).toBeUndefined();
    expect(publicAcademicUrl("https://example.org/article")).toBe("https://example.org/article");
  });
  it("requests only query metadata with no credentials/referrer and reuses a bounded memory cache", async () => {
    const request = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(payload)));
    const query = input("cache and privacy unique");
    const result = await AcademicSearchService.search(query, undefined, request);
    await AcademicSearchService.search(query, undefined, request);
    expect(request).toHaveBeenCalledTimes(1);
    expect(result.total).toBe(1);
    const options = request.mock.calls[0]?.[1];
    expect(options).toMatchObject({
      credentials: "omit",
      redirect: "error",
      referrerPolicy: "no-referrer",
      headers: { Accept: "application/json" },
    });
    expect(String(request.mock.calls[0]?.[0])).not.toContain("api_key");
  });
  it.each([401, 403, 429])(
    "reports provider quota/auth status %s without leaking its payload",
    async (status) => {
      const request = vi.fn(async () => new Response("DO_NOT_LEAK_PROVIDER_PAYLOAD", { status }));
      await expect(
        AcademicSearchService.search(input(`quota ${status}`), undefined, request),
      ).rejects.toThrow(/limitou ou recusou/);
    },
  );
  it("distinguishes invalid data, oversized answers and offline failure", async () => {
    await expect(
      AcademicSearchService.search(
        input("invalid json unique"),
        undefined,
        async () => new Response("not json"),
      ),
    ).rejects.toThrow(/resposta inválida/);
    await expect(
      AcademicSearchService.search(
        input("invalid schema unique"),
        undefined,
        async () => new Response("{}"),
      ),
    ).rejects.toThrow(/resposta inválida/);
    await expect(
      AcademicSearchService.search(
        input("huge unique"),
        undefined,
        async () => new Response("x".repeat(2000001)),
      ),
    ).rejects.toThrow(/ultrapassou/);
    await expect(
      AcademicSearchService.search(input("offline unique"), undefined, async () => {
        throw new Error("network secret");
      }),
    ).rejects.toThrow(/não respondeu/);
  });
  it("honors cancellation before request and after response without returning stale results", async () => {
    const controller = new AbortController();
    controller.abort();
    const request = vi.fn(async () => new Response(JSON.stringify(payload)));
    await expect(
      AcademicSearchService.search(input("cancel before"), controller.signal, request),
    ).rejects.toThrow(/cancelada/);
    expect(request).not.toHaveBeenCalled();
    const later = new AbortController();
    await expect(
      AcademicSearchService.search(input("cancel after"), later.signal, async () => {
        later.abort();
        return new Response(JSON.stringify(payload));
      }),
    ).rejects.toThrow(/cancelada/);
  });
  it("builds labelled Google, Scholar, SciELO and library shortcuts without making requests", () => {
    expect(externalResearchLinks("a")).toEqual([]);
    const links = externalResearchLinks('Gênesis & "criação"');
    expect(links).toHaveLength(9);
    expect(new URL(links.find((link) => link.id === "google")!.url).searchParams.get("q")).toBe(
      'Gênesis & "criação"',
    );
    const usp = links.find((link) => link.id === "usp")!;
    expect(new URL(usp.url).searchParams.get("q")).toContain("site:teses.usp.br");
    expect(usp.description).toContain("via Google");
    expect(new URL(links.find((link) => link.id === "scholar")!.url).hostname).toBe(
      "scholar.google.com",
    );
  });
});
