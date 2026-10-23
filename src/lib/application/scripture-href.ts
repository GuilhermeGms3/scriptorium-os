/**
 * The reader's address for a passage: the chapter, opened at the verse (`v`, selected and at the
 * top of the text) and in the edition the result came from, when known.
 */
export function scriptureHref(
  bookId: string,
  chapter: number,
  options: { verse?: number | undefined; edition?: string | undefined } = {},
): string {
  const search = new URLSearchParams();
  if (options.verse) search.set("v", String(options.verse));
  if (options.edition) search.set("edition", options.edition);
  const query = search.toString();
  return `/scripture/${encodeURIComponent(bookId)}/${chapter}${query ? `?${query}` : ""}`;
}
