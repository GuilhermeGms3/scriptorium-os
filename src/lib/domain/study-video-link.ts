/** A user-selected video, never an iframe URL supplied directly by a document. */
export function studyVideoId(input: string): string | null {
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    const id =
      url.hostname === "youtu.be"
        ? url.pathname.slice(1)
        : ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)
          ? url.pathname === "/watch"
            ? url.searchParams.get("v")
            : /^\/(?:embed|shorts)\/([^/]+)$/.exec(url.pathname)?.[1]
          : null;
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
