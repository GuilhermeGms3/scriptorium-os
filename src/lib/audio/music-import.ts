import { MAX_MUSIC_BYTES } from "./music-assets";
import { sha256Hex } from "../workspace-runtime/secure-context";
import { MusicTrackSchema, type MusicTrack } from "./ambience-contracts";

export function detectMusicType(
  name: string,
  declaredType: string,
  bytes: Uint8Array,
): MusicTrack["mimeType"] {
  const extension = name.toLowerCase().split(".").at(-1);
  const ascii = (start: number, length: number) =>
    String.fromCharCode(...bytes.slice(start, start + length));
  let mime: MusicTrack["mimeType"] | null = null;
  if (extension === "wav" && ascii(0, 4) === "RIFF" && ascii(8, 4) === "WAVE") mime = "audio/wav";
  if (
    extension === "mp3" &&
    (ascii(0, 3) === "ID3" ||
      (bytes[0] === 255 && ((bytes[1] ?? 0) & 0xe0) === 0xe0 && ((bytes[1] ?? 0) & 6) !== 0))
  )
    mime = "audio/mpeg";
  if (
    extension === "m4a" &&
    ascii(4, 4) === "ftyp" &&
    ["M4A ", "isom", "iso2", "mp41", "mp42"].includes(ascii(8, 4))
  )
    mime = "audio/mp4";
  if (extension === "aac" && bytes[0] === 255 && ((bytes[1] ?? 0) & 0xf6) === 0xf0)
    mime = "audio/aac";
  if (
    !mime ||
    (declaredType &&
      declaredType !== "application/octet-stream" &&
      !declaredType.startsWith("audio/"))
  )
    throw new Error("Formato inválido. Use MP3, WAV, M4A ou AAC com conteúdo de áudio real.");
  return mime;
}

/** Decode the first frames and inspect actual duration, without unbounded PCM allocation. */
export function inspectMusic(blob: Blob, signal?: AbortSignal): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(blob);
    const finish = (duration?: number, message?: string) => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      audio.onloadedmetadata = audio.oncanplay = audio.onerror = null;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      URL.revokeObjectURL(url);
      if (duration !== undefined) resolve(duration);
      else reject(new Error(message ?? "Não foi possível ler o áudio."));
    };
    const abort = () => finish(undefined, "Importação cancelada.");
    const timer = setTimeout(
      () => finish(undefined, "O áudio não pôde ser decodificado em 15 segundos."),
      15_000,
    );
    // iOS Safari often never fires canplay for a file it was not asked to play; the duration is
    // already known once the metadata loads.
    audio.onloadedmetadata = audio.oncanplay = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0 && audio.duration <= 7200)
        finish(audio.duration);
      else finish(undefined, "Duração inválida. Use trilhas com até duas horas.");
    };
    audio.onerror = () =>
      finish(undefined, "Arquivo corrompido ou formato não suportado pelo navegador.");
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) {
      abort();
      return;
    }
    audio.preload = "auto";
    audio.src = url;
    audio.load();
  });
}

export async function prepareMusicImport(
  file: File,
  inspect = inspectMusic,
  signal?: AbortSignal,
): Promise<{ track: MusicTrack; blob: Blob }> {
  if (!file.size || file.size > MAX_MUSIC_BYTES)
    throw new Error("Escolha um áudio de até 50 MB, não vazio.");
  if (signal?.aborted) throw new Error("Importação cancelada.");
  const mimeType = detectMusicType(
    file.name,
    file.type,
    new Uint8Array(await file.slice(0, 32).arrayBuffer()),
  );
  const blob = file.slice(0, file.size, mimeType);
  const duration = await inspect(blob, signal);
  const id = await sha256Hex(await blob.arrayBuffer(), { operation: "A importação de música" });
  if (signal?.aborted) throw new Error("Importação cancelada.");
  const track = MusicTrackSchema.parse({
    id,
    title:
      file.name
        .replace(/\.[^.]+$/, "")
        .replace(/\p{Cc}/gu, "")
        .trim()
        .slice(0, 120) || "Minha música",
    duration,
    mimeType,
    sizeBytes: file.size,
    originalName: file.name.slice(0, 250),
    category: "Pessoal",
    author: "Não informado",
    origin: "user-file",
    license: "private-unverified",
    playback: "personal-only",
    redistribution: false,
    mixExport: false,
  });
  return { track, blob };
}
