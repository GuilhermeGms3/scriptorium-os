import { AudioSessionSchema, type AudioProgressStorage, type AudioSession } from "./contracts";

const KEY = "scriptorium.audio-progress.v1";
/** Same boundary as reading preferences. No original/spoken/private text is stored here. */
export class BrowserAudioProgressStorage implements AudioProgressStorage {
  read(): AudioSession | null {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const result = AudioSessionSchema.safeParse(JSON.parse(raw));
    if (!result.success) throw new Error("Preferências de áudio incompatíveis.");
    return result.data;
  }
  write(session: AudioSession) {
    window.localStorage.setItem(KEY, JSON.stringify(AudioSessionSchema.parse(session)));
  }
}
