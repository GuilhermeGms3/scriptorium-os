export interface ReadingTextSection {
  start: number;
  end: number;
  text: string;
}

/** Display boundaries only. Concatenation must reproduce every UTF-16 code unit of the source. */
export function readingTextSections(text: string): ReadingTextSection[] {
  if (!text) return [];
  const boundaries = new Set<number>([0, text.length]);
  for (const match of text.matchAll(/\r?\n[\t ]*\r?\n/gu))
    boundaries.add(match.index + match[0].length);
  const paragraphs = [...boundaries].sort((a, b) => a - b);
  for (let i = 1; i < paragraphs.length; i++) {
    let start = paragraphs[i - 1]!;
    const end = paragraphs[i]!;
    if (end - start <= 1400) continue;
    // Long unstructured OCR is not split in the middle of a word or an unfinished sentence.
    for (const match of text.slice(start, end).matchAll(/[.!?…][”’"')\]]*\s+/gu)) {
      const boundary = paragraphs[i - 1]! + match.index + match[0].length;
      if (boundary - start < 850 || end - boundary < 120) continue;
      boundaries.add(boundary);
      start = boundary;
    }
  }
  const ordered = [...boundaries].sort((a, b) => a - b);
  return ordered
    .slice(1)
    .map((end, i) => ({ start: ordered[i]!, end, text: text.slice(ordered[i], end) }));
}

/** A bounded contiguous window; first/last remain reachable through keyboard Home/End. */
export function readingIndicatorWindow(count: number, active: number, capacity: number): number[] {
  if (!Number.isFinite(count) || !Number.isFinite(capacity) || count <= 0 || capacity <= 0)
    return [];
  const size = Math.min(Math.floor(count), Math.floor(capacity));
  const selected = Number.isFinite(active)
    ? Math.max(0, Math.min(Math.floor(count) - 1, Math.floor(active)))
    : 0;
  const start = Math.max(0, Math.min(Math.floor(count) - size, selected - Math.floor(size / 2)));
  return Array.from({ length: size }, (_, i) => start + i);
}

/** Empty slots at the boundaries keep the current stroke in the visual center. */
export function centeredReadingIndicatorSlots(
  count: number,
  active: number,
  capacity: number,
): (number | null)[] {
  if (count <= 0 || capacity <= 0) return [];
  const size = Math.max(1, Math.min(9, Math.floor(capacity)));
  const radius = Math.floor((size % 2 ? size : size - 1) / 2);
  const current = Math.max(0, Math.min(count - 1, active));
  return Array.from({ length: radius * 2 + 1 }, (_, index) => {
    const target = current + index - radius;
    return target >= 0 && target < count ? target : null;
  });
}

/** Ignore the sliver of the preceding section, but retain a fully visible short paragraph. */
export function activeReadingSection(
  rects: readonly { top: number; bottom: number }[],
  top: number,
  bottom: number,
): number {
  let best = 0;
  let mostVisible = 0;
  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i]!;
    const visible = Math.max(0, Math.min(rect.bottom, bottom) - Math.max(rect.top, top));
    if (visible > 0 && visible >= Math.min((rect.bottom - rect.top) / 2, (bottom - top) / 2))
      return i;
    if (visible > mostVisible) {
      best = i;
      mostVisible = visible;
    }
  }
  // A long inline commentary can fill the viewport between two verse anchors.
  // Keep its preceding verse until the following verse is sufficiently visible.
  for (let i = rects.length - 1; i >= 0; i--) if (rects[i]!.top <= top) return i;
  return best;
}
