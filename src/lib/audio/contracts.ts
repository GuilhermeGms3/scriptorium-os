import { z } from "zod";
import { TextAnchorSchema } from "../domain/text-identity";
import type { AmbienceSnapshot } from "./ambience-contracts";

export const AudioSourceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("scripture"),
    bookId: z.string().min(1).max(150),
    chapter: z.number().int().positive(),
    verseStart: z.number().int().nonnegative().optional(),
    verseEnd: z.number().int().nonnegative().optional(),
    editionId: z.string().min(1).max(250),
    anchors: z.array(TextAnchorSchema).min(1).max(500),
    attribution: z.string().max(3000),
    licenseId: z.string().min(1),
  }),
  z.object({ kind: z.literal("personal"), id: z.string().min(1).max(100) }),
]);
export type AudioSource = z.infer<typeof AudioSourceSchema>;
export interface NarrationSegment {
  originalText: string;
  spokenText: string;
  /** UTF-16 positions in the original, never fabricated timing information. */
  start: number;
  end: number;
}
export interface AudioItem {
  id: string;
  title: string;
  language: string;
  source: AudioSource;
  mode: "literal" | "commented" | "study" | "reflection";
  originalText: string;
  segments: NarrationSegment[];
  contentHash: string;
  preparationVersion: string;
}
export interface NarrationVoice {
  id: string;
  name: string;
  language: string;
  local: boolean;
}
export interface NarrationSettings {
  voiceId: string;
  rate: number;
  volume: number;
}
export interface SpeechEvents {
  started(): void;
  boundary(offset: number): void;
  ended(): void;
  failed(message: string): void;
}
/** No credentials, browser APIs or vendor-specific objects in application contracts. */
export interface NarrationProvider {
  readonly id: string;
  readonly capabilities: {
    output: "device-speech" | "file" | "stream";
    localOnly: boolean;
    pitch: boolean;
    rate: boolean;
    volume: boolean;
    exportAudio: boolean;
  };
  voices(): NarrationVoice[];
  onVoicesChanged(listener: () => void): () => void;
  speak(text: string, language: string, settings: NarrationSettings, events: SpeechEvents): void;
  pause(): void;
  resume(): void;
  cancel(): void;
}
export type PlaybackStatus =
  "idle" | "ready" | "loading" | "playing" | "paused" | "ended" | "error";
export interface AudioProgress {
  id: string;
  title: string;
  language: string;
  source: AudioSource;
  contentHash: string;
  segmentIndex: number;
  offset: number;
  updatedAt: string;
}
export interface AudioSnapshot {
  ambience: AmbienceSnapshot;
  item: AudioItem | null;
  status: PlaybackStatus;
  segmentIndex: number;
  offset: number;
  settings: NarrationSettings;
  voices: NarrationVoice[];
  history: AudioProgress[];
  error: string | null;
  storageWarning: string | null;
  queue: AudioItem[];
}
export const AudioSessionSchema = z.object({
  version: z.literal(1),
  settings: z.object({
    voiceId: z.string().max(500),
    rate: z.number().min(0.5).max(2),
    volume: z.number().min(0).max(1),
  }),
  history: z
    .array(
      z.object({
        id: z.string().max(100),
        title: z.string().max(300),
        language: z.string().max(30),
        source: AudioSourceSchema,
        contentHash: z.string().regex(/^[a-f0-9]{64}$/),
        segmentIndex: z.number().int().nonnegative(),
        offset: z.number().int().nonnegative(),
        updatedAt: z.string().datetime(),
      }),
    )
    .max(20),
});
export type AudioSession = z.infer<typeof AudioSessionSchema>;
export interface AudioProgressStorage {
  read(): AudioSession | null;
  write(session: AudioSession): void;
}
