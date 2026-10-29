import { afterEach, describe, expect, it, vi } from "vitest";
import { YouTubeStudyService } from "./youtube-study-service";

const testKey = "test-key-for-isolated-unit-tests";
const video = {
  id: { videoId: "abcdefghijk" },
  snippet: {
    title: "Aula",
    description: "Descrição",
    channelTitle: "Canal",
    publishedAt: "2026-01-01T00:00:00Z",
  },
};
afterEach(() => YouTubeStudyService.configure(""));
describe("YouTube study boundary", () => {
  it("sends only the explicit query to the allowed Google endpoint and keeps the key out of URLs", async () => {
    YouTubeStudyService.configure(testKey);
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ items: [video, { id: { videoId: "bad-url" } }] })),
      );
    const result = await YouTubeStudyService.search("Trindade estudo", undefined, request);
    const [url, init] = request.mock.calls[0]!;
    expect(String(url)).toMatch(/^https:\/\/www.googleapis.com\/youtube\/v3\/search\?/u);
    expect(String(url)).not.toContain(testKey);
    expect(new URL(String(url)).searchParams.get("q")).toBe("Trindade estudo");
    expect(init?.headers).toEqual({ "X-Goog-Api-Key": testKey });
    expect(init?.credentials).toBe("omit");
    expect(result).toHaveLength(1);
  });
  it("caches explicit requests only and clears the cache when the key changes", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => new Response(JSON.stringify({ items: [video] })));
    YouTubeStudyService.configure(testKey);
    expect(request).not.toHaveBeenCalled();
    await YouTubeStudyService.search("Trindade", undefined, request);
    await YouTubeStudyService.search("Trindade", undefined, request);
    expect(request).toHaveBeenCalledTimes(1);
    YouTubeStudyService.configure(`${testKey}-different`);
    await YouTubeStudyService.search("Trindade", undefined, request);
    expect(request).toHaveBeenCalledTimes(2);
  });
  it("does not display data returned after disconnecting a key", async () => {
    YouTubeStudyService.configure(testKey);
    let answer!: (response: Response) => void;
    const request = vi.fn<typeof fetch>().mockImplementation(
      () =>
        new Promise((resolve) => {
          answer = resolve;
        }),
    );
    const pending = YouTubeStudyService.search("Trindade", undefined, request);
    YouTubeStudyService.configure("");
    answer(new Response(JSON.stringify({ items: [video] })));
    await expect(pending).rejects.toThrow("configuração mudou");
  });
  it("reports quota/key errors without echoing provider payloads or credentials", async () => {
    YouTubeStudyService.configure(testKey);
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: { message: testKey } }), { status: 403 }),
      );
    await expect(YouTubeStudyService.search("Trindade", undefined, request)).rejects.toThrow(
      "cota",
    );
    const offline = vi.fn<typeof fetch>().mockRejectedValue(new Error(testKey));
    await expect(YouTubeStudyService.search("Trindade", undefined, offline)).rejects.toThrow(
      "não respondeu",
    );
    const invalid = vi.fn<typeof fetch>().mockResolvedValue(new Response("not-json"));
    await expect(YouTubeStudyService.search("Trindade", undefined, invalid)).rejects.toThrow(
      "resposta inválida",
    );
  });
  it("does not make requests without configuration", async () => {
    const request = vi.fn<typeof fetch>();
    await expect(YouTubeStudyService.search("Trindade", undefined, request)).rejects.toThrow(
      "Configure",
    );
    expect(request).not.toHaveBeenCalled();
  });
});
