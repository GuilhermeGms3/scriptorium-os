import { z } from "zod";

export const MUSIC_CATEGORIES = [
  "Pessoal",
  "Lo-Fi para Estudos",
  "Instrumentais Contemplativos",
  "Ambientes Naturais",
  "Concentração Profunda",
] as const;
export const MusicTrackSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{64}$/),
  title: z.string().trim().min(1).max(120),
  category: z.enum(MUSIC_CATEGORIES),
  duration: z.number().positive().max(7200),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(50 * 1024 * 1024),
  mimeType: z.enum(["audio/mpeg", "audio/wav", "audio/mp4", "audio/aac"]),
  originalName: z.string().max(250),
  author: z.literal("Não informado"),
  origin: z.literal("user-file"),
  license: z.literal("private-unverified"),
  playback: z.literal("personal-only"),
  redistribution: z.literal(false),
  mixExport: z.literal(false),
});
export type MusicTrack = z.infer<typeof MusicTrackSchema>;
export const AmbiencePreferencesSchema = z.object({
  version: z.literal(1),
  mode: z.enum(["voice", "mixed", "music"]),
  selectedTrackId: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .nullable(),
  volume: z.number().min(0).max(1),
  loop: z.boolean(),
  pauseWithVoice: z.boolean(),
});
export type SoundMode = z.infer<typeof AmbiencePreferencesSchema>["mode"];
export type AmbiencePreferences = z.infer<typeof AmbiencePreferencesSchema>;
export interface AmbienceSnapshot {
  preferences: AmbiencePreferences;
  tracks: MusicTrack[];
  status: "idle" | "loading" | "ready" | "playing" | "paused" | "ended" | "error";
  error: string | null;
  warning: string | null;
  position: number;
  available: boolean;
}
export const EMPTY_AMBIENCE: AmbienceSnapshot = {
  preferences: {
    version: 1,
    mode: "voice",
    selectedTrackId: null,
    volume: 0.15,
    loop: true,
    pauseWithVoice: false,
  },
  tracks: [],
  status: "idle",
  error: null,
  warning: null,
  position: 0,
  available: false,
};
export interface MusicAssetStore {
  list(): Promise<MusicTrack[]>;
  read(id: string): Promise<Blob>;
  put(track: MusicTrack, blob: Blob, signal?: AbortSignal): Promise<MusicTrack>;
  update(track: MusicTrack): Promise<void>;
  remove(id: string): Promise<void>;
}
export interface MusicChannel {
  load(
    blob: Blob,
    events: { ended(): void; failed(): void; position(seconds: number): void },
  ): void;
  play(): Promise<void>;
  pause(): void;
  configure(volume: number, loop: boolean): void;
  dispose(): void;
}
