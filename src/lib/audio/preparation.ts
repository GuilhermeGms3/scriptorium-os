import { sha256Hex } from "../workspace-runtime/secure-context";
import {
  AudioSourceSchema,
  type AudioItem,
  type AudioSource,
  type NarrationSegment,
} from "./contracts";

export const PREPARATION_VERSION = "literal-utf16-1";
export const MAX_NARRATION_CHARACTERS = 100_000;

/** Split without removing, reordering or inventing a single character. */
export function segmentLiteralText(text: string, limit = 600): NarrationSegment[] {
  if (!text.trim()) throw new Error("Escolha um texto para ouvir.");
  if (text.length > MAX_NARRATION_CHARACTERS)
    throw new Error("Divida o texto em trechos de até 100 mil caracteres.");
  if (!Number.isInteger(limit) || limit < 40 || limit > 2000)
    throw new Error("Limite de segmento inválido.");
  const result: NarrationSegment[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + limit, text.length);
    if (end < text.length) {
      const candidate = text.slice(start, end);
      const sentence = [...candidate.matchAll(/[.!?;]\s+|\n+/gu)].at(-1);
      const last =
        sentence && sentence.index > limit / 3 ? sentence : [...candidate.matchAll(/\s+/gu)].at(-1);
      if (last && last.index > limit / 3) end = start + last.index + last[0].length;
      // Do not split a surrogate pair even when the source has no whitespace.
      const previous = text.charCodeAt(end - 1);
      if (previous >= 0xd800 && previous <= 0xdbff) end--;
    }
    const originalText = text.slice(start, end);
    result.push({ originalText, spokenText: originalText, start, end });
    start = end;
  }
  return result;
}

export async function audioFingerprint(value: unknown): Promise<string> {
  return sha256Hex(JSON.stringify(value), { operation: "A narração" });
}

export async function createAudioItem(input: {
  title: string;
  language: string;
  source: AudioSource;
  text: string;
}): Promise<AudioItem> {
  const source = AudioSourceSchema.parse(input.source);
  if (
    !input.title.trim() ||
    input.title.length > 300 ||
    !input.language ||
    input.language.length > 30
  )
    throw new Error("Identificação da leitura inválida.");
  const segments = segmentLiteralText(input.text);
  const contentHash = await audioFingerprint({
    text: input.text,
    source,
    preparationVersion: PREPARATION_VERSION,
  });
  return {
    id: `audio:${contentHash}`,
    title: input.title,
    language: input.language,
    source,
    mode: "literal",
    originalText: input.text,
    segments,
    contentHash,
    preparationVersion: PREPARATION_VERSION,
  };
}

/** Future generated-file cache keys must include the actually spoken text and configuration. */
export function generationFingerprint(
  item: AudioItem,
  provider: string,
  model: string,
  voice: string,
  settings: unknown,
) {
  return audioFingerprint({
    contentHash: item.contentHash,
    spokenText: item.segments.map((segment) => segment.spokenText),
    preparation: item.preparationVersion,
    provider,
    model,
    voice,
    settings,
  });
}
