import { z } from "zod";

export const AcademicQuerySchema = z
  .object({
    query: z
      .string()
      .trim()
      .min(2, "Digite pelo menos dois caracteres.")
      .max(240, "Use até 240 caracteres na pesquisa externa."),
    language: z.enum(["all", "pt", "en", "es"]).default("all"),
    openAccessOnly: z.boolean().default(false),
    fromYear: z.number().int().min(1000).max(3000).optional(),
    toYear: z.number().int().min(1000).max(3000).optional(),
    page: z.number().int().min(1).max(10).default(1),
  })
  .refine(
    (input) =>
      input.fromYear === undefined || input.toYear === undefined || input.fromYear <= input.toYear,
    { message: "O ano inicial precisa ser anterior ou igual ao ano final." },
  );
export type AcademicQuery = z.infer<typeof AcademicQuerySchema>;
export interface AcademicResult {
  kind: "external-academic";
  provider: "OpenAlex";
  id: string;
  title: string;
  authors: string[];
  institutions: string[];
  year?: number;
  language?: string;
  publicationType: string;
  venue?: string;
  doi?: string;
  url: string;
  originalUrl?: string;
  openAccess: boolean;
  openAccessUrl?: string;
}
export interface AcademicSearchPage {
  items: AcademicResult[];
  total: number;
  page: number;
  perPage: number;
  skipped: number;
}

/** Navigation only: metadata never causes automatic fetches of publisher/PDF URLs. */
export function publicAcademicUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 4096) return undefined;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      !host ||
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host.includes(":") ||
      /^(?:0|10|127)\.|^169\.254\.|^192\.168\.|^172\.(?:1[6-9]|2\d|3[01])\./.test(host) ||
      /^\d+$/.test(host)
    )
      return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}
