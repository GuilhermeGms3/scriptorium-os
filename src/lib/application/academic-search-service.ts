import { z } from "zod";
import {
  AcademicQuerySchema,
  publicAcademicUrl,
  type AcademicQuery,
  type AcademicResult,
  type AcademicSearchPage,
} from "../domain/academic-search";

const label = z.string().max(2000);
const workSchema = z.object({
  id: z.string().regex(/^https:\/\/openalex\.org\/W\d+$/),
  display_name: label.min(1),
  doi: z.string().max(4096).nullable().optional(),
  publication_year: z.number().int().min(-5000).max(3000).nullable().optional(),
  language: z.string().max(20).nullable().optional(),
  type: z.string().max(100),
  authorships: z
    .array(
      z.object({
        author: z.object({ display_name: label }),
        institutions: z.array(z.object({ display_name: label })).max(100),
      }),
    )
    .max(1000)
    .default([]),
  primary_location: z
    .object({
      landing_page_url: z.string().max(4096).nullable().optional(),
      source: z.object({ display_name: label.nullable().optional() }).nullable().optional(),
    })
    .nullable()
    .optional(),
  open_access: z
    .object({ is_oa: z.boolean(), oa_url: z.string().max(4096).nullable().optional() })
    .optional(),
});
const responseSchema = z.object({
  meta: z.object({ count: z.number().int().nonnegative() }),
  results: z.array(z.unknown()).max(100),
});
const PAGE_SIZE = 10;
const cache = new Map<string, { at: number; value: AcademicSearchPage }>();

export function academicSearchUrl(input: AcademicQuery): URL {
  const valid = AcademicQuerySchema.parse(input);
  const url = new URL("https://api.openalex.org/works");
  const filters: string[] = [];
  if (valid.language !== "all") filters.push(`language:${valid.language}`);
  if (valid.openAccessOnly) filters.push("is_oa:true");
  if (valid.fromYear || valid.toYear)
    filters.push(`publication_year:${valid.fromYear ?? ""}-${valid.toYear ?? ""}`);
  url.search = new URLSearchParams({
    search: valid.query,
    per_page: String(PAGE_SIZE),
    page: String(valid.page),
    select:
      "id,display_name,doi,publication_year,language,type,authorships,primary_location,open_access",
    ...(filters.length ? { filter: filters.join(",") } : {}),
  }).toString();
  return url;
}
export function parseAcademicPage(raw: unknown, page: number): AcademicSearchPage {
  const parsed = responseSchema.safeParse(raw);
  if (!parsed.success) throw new Error("O catálogo acadêmico devolveu uma resposta inválida.");
  let skipped = 0;
  const seen = new Set<string>();
  const items: AcademicResult[] = [];
  for (const item of parsed.data.results) {
    const result = workSchema.safeParse(item);
    if (!result.success) {
      skipped++;
      continue;
    }
    const work = result.data;
    if (seen.has(work.id)) continue;
    seen.add(work.id);
    const originalUrl = publicAcademicUrl(work.primary_location?.landing_page_url);
    const oaUrl = publicAcademicUrl(work.open_access?.oa_url);
    const doi = work.doi?.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "");
    const validDoi = doi && /^10\.\d{4,9}\/\S+$/.test(doi) ? doi : undefined;
    const venue = work.primary_location?.source?.display_name;
    items.push({
      kind: "external-academic",
      provider: "OpenAlex",
      id: work.id,
      title: work.display_name,
      authors: work.authorships.slice(0, 12).map((author) => author.author.display_name),
      institutions: [
        ...new Set(
          work.authorships.flatMap((author) =>
            author.institutions.map((institution) => institution.display_name),
          ),
        ),
      ].slice(0, 8),
      ...(work.publication_year !== null && work.publication_year !== undefined
        ? { year: work.publication_year }
        : {}),
      ...(work.language ? { language: work.language } : {}),
      publicationType: work.type,
      ...(venue ? { venue } : {}),
      ...(validDoi ? { doi: validDoi } : {}),
      url: work.id,
      ...(originalUrl ? { originalUrl } : {}),
      openAccess: work.open_access?.is_oa ?? false,
      ...(work.open_access?.is_oa && oaUrl ? { openAccessUrl: oaUrl } : {}),
    });
  }
  return { items, total: parsed.data.meta.count, page, perPage: PAGE_SIZE, skipped };
}
export const AcademicSearchService = {
  async search(
    input: AcademicQuery,
    signal?: AbortSignal,
    request: typeof fetch = fetch,
  ): Promise<AcademicSearchPage> {
    const url = academicSearchUrl(input);
    if (signal?.aborted) throw new Error("Pesquisa cancelada.");
    const key = url.href;
    const saved = cache.get(key);
    if (saved && Date.now() - saved.at < 5 * 60_000) return saved.value;
    let response: Response;
    try {
      response = await request(url, {
        credentials: "omit",
        redirect: "error",
        referrerPolicy: "no-referrer",
        headers: { Accept: "application/json" },
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(15_000)])
          : AbortSignal.timeout(15_000),
      });
    } catch {
      if (signal?.aborted) throw new Error("Pesquisa cancelada.");
      throw new Error(
        "O catálogo acadêmico não respondeu. Confira sua conexão ou tente os atalhos de pesquisa externa.",
      );
    }
    if (response.status === 429 || response.status === 401 || response.status === 403)
      throw new Error(
        "O OpenAlex limitou ou recusou a consulta. Tente mais tarde ou abra a mesma pesquisa no Google Acadêmico. Nenhum conteúdo local foi enviado.",
      );
    if (!response.ok)
      throw new Error(
        "O catálogo acadêmico está indisponível no momento. Tente novamente mais tarde.",
      );
    const text = await response.text();
    if (text.length > 2_000_000)
      throw new Error("A resposta acadêmica ultrapassou o limite desta consulta.");
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      throw new Error("O catálogo acadêmico devolveu uma resposta inválida.");
    }
    if (signal?.aborted) throw new Error("Pesquisa cancelada.");
    const value = parseAcademicPage(raw, input.page);
    if (cache.size >= 20) cache.delete(cache.keys().next().value!);
    cache.set(key, { at: Date.now(), value });
    return value;
  },
};
