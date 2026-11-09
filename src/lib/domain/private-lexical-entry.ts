export function normalizeHeadword(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").replace(/\s/gu, "").toLocaleLowerCase();
}
export interface GreekEntrySpan {
  lemma: string;
  start: number;
  end: number;
}
/** Conservative page-local headings; final entry is omitted because its continuation is unknown. */
export function greekDictionaryEntries(text: string): GreekEntrySpan[] {
  const starts = [
    ...text.matchAll(
      /^(\p{Script=Greek}[\p{Script=Greek}\p{M}]+)(?:[,،.]\s+| {2,}(?=\p{Script=Latin}))[^\n]{1,80}/gmu,
    ),
  ];
  return starts.slice(0, -1).map((match, index) => ({
    lemma: match[1]!,
    start: match.index,
    end: starts[index + 1]!.index,
  }));
}
