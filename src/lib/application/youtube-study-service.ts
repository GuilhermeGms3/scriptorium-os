import { z } from "zod";

const videoId = z.string().regex(/^[A-Za-z0-9_-]{11}$/u);
const itemSchema = z.object({
  id: z.object({ videoId }),
  snippet: z.object({
    title: z.string().max(1000),
    description: z.string().max(10000),
    channelTitle: z.string().max(1000),
    publishedAt: z.string().max(50),
  }),
});
const responseSchema = z.object({ items: z.array(z.unknown()).max(50) });
export interface StudyVideo {
  id: string;
  title: string;
  description: string;
  channel: string;
  publishedAt: string;
}

let apiKey = "";
let revision = 0;
const listeners = new Set<() => void>();
const cache = new Map<string, { at: number; items: StudyVideo[] }>();
/** Restricted browser API key, held only in this tab's memory. Never included in notes or backups. */
export const YouTubeStudyService = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  revision: () => revision,
  configured: () => apiKey.length > 0,
  configure(value: string) {
    const clean = value.trim();
    if (clean && !/^[A-Za-z0-9_-]{20,200}$/u.test(clean))
      throw new Error("Confira a chave da YouTube Data API v3.");
    apiKey = clean;
    revision += 1;
    cache.clear();
    for (const listener of listeners) listener();
  },
  async search(
    query: string,
    signal?: AbortSignal,
    request: typeof fetch = fetch,
  ): Promise<StudyVideo[]> {
    const term = z.string().trim().min(2).max(180).parse(query);
    if (!apiKey) throw new Error("Configure a chave do YouTube para consultar vídeos.");
    const saved = cache.get(term);
    if (saved && Date.now() - saved.at < 15 * 60_000) return saved.items;
    const currentRevision = revision;
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.search = new URLSearchParams({
      part: "snippet",
      type: "video",
      q: term,
      maxResults: "6",
      relevanceLanguage: "pt",
      safeSearch: "moderate",
      videoEmbeddable: "true",
    }).toString();
    let response: Response;
    try {
      response = await request(url, {
        headers: { "X-Goog-Api-Key": apiKey },
        credentials: "omit",
        redirect: "error",
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(15_000)])
          : AbortSignal.timeout(15_000),
      });
    } catch {
      if (signal?.aborted) throw new Error("Consulta cancelada.");
      throw new Error("O YouTube não respondeu. Confira a conexão e tente novamente.");
    }
    if (!response.ok) {
      if (response.status === 403 || response.status === 429)
        throw new Error(
          "Consulta recusada pelo YouTube. Confira a ativação da API, a cota e as restrições da chave.",
        );
      if (response.status === 400 || response.status === 401)
        throw new Error("A chave ou a consulta não foi aceita pelo YouTube.");
      throw new Error("O YouTube está indisponível. Tente novamente mais tarde.");
    }
    let payload: z.infer<typeof responseSchema>;
    try {
      payload = responseSchema.parse(await response.json());
    } catch {
      throw new Error("O YouTube devolveu uma resposta inválida.");
    }
    const items = payload.items.flatMap((raw) => {
      const parsed = itemSchema.safeParse(raw);
      return parsed.success
        ? [
            {
              id: parsed.data.id.videoId,
              title: parsed.data.snippet.title,
              description: parsed.data.snippet.description,
              channel: parsed.data.snippet.channelTitle,
              publishedAt: parsed.data.snippet.publishedAt,
            },
          ]
        : [];
    });
    if (currentRevision !== revision || signal?.aborted)
      throw new Error("A configuração mudou. Faça a consulta novamente.");
    if (cache.size >= 20) cache.delete(cache.keys().next().value!);
    cache.set(term, { at: Date.now(), items });
    return items;
  },
};
