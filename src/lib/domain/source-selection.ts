import { z } from "zod";

/** UTF-16 offsets into the displayed original, never a translation or a PDF image. */
export const SourceSelectionSchema = z
  .object({
    start: z.number().int().nonnegative(),
    end: z.number().int().positive(),
    quote: z.string().min(1).max(20000),
  })
  .refine(
    (value) => value.end > value.start && value.end - value.start === value.quote.length,
    "Intervalo de seleção inválido.",
  );
export type SourceSelection = z.infer<typeof SourceSelectionSchema>;
export function sourceSelectionMatches(text: string, selection: SourceSelection): boolean {
  return (
    selection.end <= text.length && text.slice(selection.start, selection.end) === selection.quote
  );
}
export function captureSourceSelection(root: HTMLElement): SourceSelection | null {
  const selection = root.ownerDocument.getSelection();
  if (!selection?.rangeCount || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
  const prefix = range.cloneRange();
  prefix.selectNodeContents(root);
  prefix.setEnd(range.startContainer, range.startOffset);
  const start = prefix.toString().length;
  const quote = range.toString();
  const result = SourceSelectionSchema.safeParse({ start, end: start + quote.length, quote });
  return result.success && sourceSelectionMatches(root.textContent ?? "", result.data)
    ? result.data
    : null;
}
