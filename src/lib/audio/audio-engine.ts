import type {
  AudioItem,
  AudioProgressStorage,
  AudioSnapshot,
  NarrationProvider,
  NarrationSettings,
} from "./contracts";
import { EMPTY_AMBIENCE, type SoundMode } from "./ambience-contracts";
import type { AmbienceController } from "./ambience-controller";

export const EMPTY_AUDIO_SNAPSHOT: AudioSnapshot = {
  ambience: EMPTY_AMBIENCE,
  item: null,
  status: "idle",
  segmentIndex: 0,
  offset: 0,
  settings: { voiceId: "", rate: 1, volume: 1 },
  voices: [],
  history: [],
  error: null,
  storageWarning: null,
  queue: [],
};

/** One controller per app shell. Route changes never own or dispose playback. */
export class AudioEngine {
  #state: AudioSnapshot = EMPTY_AUDIO_SNAPSHOT;
  #listeners = new Set<() => void>();
  #token = 0;
  #lastCheckpoint = 0;
  #voiceSuppressedByMode = false;
  #musicPausedWithVoice = false;
  #unsubscribeVoices: (() => void) | undefined;
  constructor(
    private readonly provider: NarrationProvider | null,
    private readonly storage: AudioProgressStorage | null,
    readonly ambience: AmbienceController | null = null,
  ) {
    ambience?.onChange((state) => this.#patch({ ambience: state }));
  }
  getSnapshot = () => this.#state;
  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };
  #patch(patch: Partial<AudioSnapshot>) {
    this.#state = { ...this.#state, ...patch };
    this.#listeners.forEach((listener) => listener());
  }
  initialize() {
    void this.ambience?.initialize();
    try {
      const saved = this.storage?.read();
      if (saved) this.#patch({ settings: saved.settings, history: saved.history });
    } catch {
      this.#patch({
        storageWarning:
          "Não foi possível recuperar o progresso de áudio. A leitura continua disponível.",
      });
    }
    const updateVoices = () => this.#patch({ voices: this.provider?.voices() ?? [] });
    updateVoices();
    this.#unsubscribeVoices = this.provider?.onVoicesChanged(updateVoices);
  }
  dispose() {
    this.#token++;
    this.provider?.cancel();
    this.#unsubscribeVoices?.();
    this.ambience?.dispose();
  }
  #save() {
    const { item, history, segmentIndex, offset, settings } = this.#state;
    const nextHistory = item
      ? [
          {
            id: item.id,
            title: item.title,
            language: item.language,
            source: item.source,
            contentHash: item.contentHash,
            segmentIndex,
            offset,
            updatedAt: new Date().toISOString(),
          },
          ...history.filter((entry) => entry.id !== item.id),
        ].slice(0, 20)
      : history;
    this.#patch({ history: nextHistory });
    try {
      this.storage?.write({ version: 1, settings, history: nextHistory });
    } catch {
      this.#patch({
        storageWarning:
          "O progresso não pôde ser salvo neste navegador. Não apague os dados para tentar corrigir.",
      });
    }
  }
  load(item: AudioItem) {
    this.#voiceSuppressedByMode = false;
    this.#token++;
    this.provider?.cancel();
    const previous = this.#state.history.find(
      (entry) => entry.id === item.id && entry.contentHash === item.contentHash,
    );
    const segmentIndex = Math.min(previous?.segmentIndex ?? 0, item.segments.length - 1);
    const offset = Math.min(previous?.offset ?? 0, item.segments[segmentIndex]!.spokenText.length);
    const currentVoice = this.#state.voices.find(
      (voice) =>
        voice.id === this.#state.settings.voiceId &&
        voice.language.split(/[-_]/)[0] === item.language.split(/[-_]/)[0],
    );
    const voice =
      currentVoice ??
      this.#state.voices.find((voice) => voice.language === item.language) ??
      this.#state.voices.find(
        (voice) => voice.language.split(/[-_]/)[0] === item.language.split(/[-_]/)[0],
      );
    this.#patch({
      item,
      segmentIndex,
      offset,
      status:
        segmentIndex === item.segments.length - 1 &&
        offset === item.segments[segmentIndex]!.spokenText.length
          ? "ended"
          : "ready",
      error: null,
      settings: { ...this.#state.settings, voiceId: voice?.id ?? "" },
    });
    this.#save();
  }
  play() {
    if (this.#state.ambience.preferences.mode === "music") {
      this.#patch({
        error:
          "O modo Somente música está ativo. Escolha Voz ou Voz + Música para ouvir a narração.",
      });
      return;
    }
    if (!this.#state.item) return;
    if (this.#musicPausedWithVoice && this.#state.ambience.preferences.mode === "mixed") {
      this.#musicPausedWithVoice = false;
      void this.ambience?.play();
    }
    if (this.#state.status === "playing" || this.#state.status === "loading") return;
    // A paused reading starts again from the last word heard (see pause).
    if (this.#state.status === "ended") this.#patch({ segmentIndex: 0, offset: 0 });
    this.#speak();
  }
  #speak() {
    const { item, segmentIndex, offset, settings } = this.#state;
    if (!item) return;
    if (!this.provider || !settings.voiceId) {
      this.#patch({
        status: "error",
        error:
          "Nenhuma voz local compatível disponível. Instale uma voz para este idioma no dispositivo e tente novamente.",
      });
      return;
    }
    const token = ++this.#token;
    const text = item.segments[segmentIndex]!.spokenText.slice(offset);
    if (!text.trim()) {
      this.#advance();
      return;
    }
    this.#patch({ status: "loading", error: null });
    this.provider.speak(text, item.language, settings, {
      started: () => {
        if (token === this.#token) this.#patch({ status: "playing" });
      },
      boundary: (position) => {
        if (token !== this.#token) return;
        this.#patch({
          offset: Math.min(
            offset + Math.max(0, position),
            item.segments[segmentIndex]!.spokenText.length,
          ),
        });
        if (Date.now() - this.#lastCheckpoint >= 3000) {
          this.#lastCheckpoint = Date.now();
          this.#save();
        }
      },
      ended: () => {
        if (token === this.#token) this.#advance();
      },
      failed: (error) => {
        if (token === this.#token) {
          this.#patch({ status: "error", error });
          this.#save();
        }
      },
    });
  }
  #advance() {
    const { item, segmentIndex } = this.#state;
    if (!item) return;
    const paused = this.#state.status === "paused";
    if (segmentIndex + 1 < item.segments.length) {
      this.#patch({
        segmentIndex: segmentIndex + 1,
        offset: 0,
        ...(paused ? { status: "ready" as const } : {}),
      });
      this.#save();
      if (!paused) this.#speak();
    } else {
      this.#patch({ status: "ended", offset: item.segments[segmentIndex]!.spokenText.length });
      this.#save();
      const next = this.#state.queue[0];
      if (next) {
        this.#patch({ queue: this.#state.queue.slice(1) });
        this.load(next);
        if (!paused) this.play();
      }
    }
  }
  /** Lets the device voice start later, after an await; call it inside the tap that plays. */
  unlock() {
    this.provider?.unlock?.();
  }
  pause() {
    if (this.#state.status !== "playing" && this.#state.status !== "loading") return;
    // Chrome on Android ignores or mishandles speechSynthesis.pause(): stop instead, keep the offset
    // of the last word heard, and speak again from there on play. It works the same everywhere.
    this.#token++;
    this.provider?.cancel();
    this.#patch({ status: "paused" });
    this.#save();
    if (
      this.#state.ambience.preferences.pauseWithVoice &&
      this.#state.ambience.preferences.mode === "mixed" &&
      ["playing", "loading"].includes(this.#state.ambience.status)
    ) {
      this.#musicPausedWithVoice = true;
      this.ambience?.pause();
    }
  }
  seekSegment(index: number) {
    if (!this.#state.item || !Number.isInteger(index)) return;
    const playing = this.#state.status === "playing" || this.#state.status === "loading";
    this.#token++;
    this.provider?.cancel();
    this.#patch({
      segmentIndex: Math.max(0, Math.min(index, this.#state.item.segments.length - 1)),
      offset: 0,
      status: "ready",
      error: null,
    });
    this.#save();
    if (playing) this.#speak();
  }
  configure(settings: Partial<NarrationSettings>) {
    const merged = { ...this.#state.settings, ...settings };
    if (
      !Number.isFinite(merged.rate) ||
      merged.rate < 0.5 ||
      merged.rate > 2 ||
      !Number.isFinite(merged.volume) ||
      merged.volume < 0 ||
      merged.volume > 1
    )
      return;
    // Native speech has no reliable live gain. Apply voice-only volume at next segment,
    // preserving the ongoing utterance instead of cutting/restarting it.
    if (settings.voiceId === undefined && settings.rate === undefined) {
      this.#patch({ settings: merged });
      this.#save();
      return;
    }
    const playing = this.#state.status === "playing" || this.#state.status === "loading";
    const paused = this.#state.status === "paused";
    this.#token++;
    this.provider?.cancel();
    this.#patch({ settings: merged, status: this.#state.item ? "ready" : "idle" });
    this.#save();
    if (playing) this.#speak();
    else if (paused) this.#patch({ status: "ready" });
  }
  enqueue(item: AudioItem) {
    if (this.#state.queue.length >= 30) {
      this.#patch({ error: "A fila comporta até 30 leituras nesta etapa." });
      return false;
    }
    this.#patch({ queue: [...this.#state.queue, item] });
    return true;
  }
  removeQueued(index: number) {
    this.#patch({ queue: this.#state.queue.filter((_, position) => position !== index) });
  }
  close() {
    this.#save();
    this.#token++;
    this.provider?.cancel();
    this.#patch({ item: null, status: "idle", error: null, offset: 0, segmentIndex: 0 });
  }
  setSoundMode(mode: SoundMode) {
    if (mode === this.#state.ambience.preferences.mode) return;
    this.#patch({ error: null });
    if (mode === "music") {
      this.#voiceSuppressedByMode =
        this.#state.status === "playing" || this.#state.status === "loading";
      if (this.#state.status === "loading") {
        this.#token++;
        this.provider?.cancel();
        this.#patch({ status: "ready" });
      } else this.pause();
    }
    this.ambience?.configure({ mode });
    if (mode !== "mixed") this.#musicPausedWithVoice = false;
    if (mode === "voice") this.ambience?.pause();
    else if (this.#state.ambience.preferences.selectedTrackId) void this.ambience?.play();
    if (mode !== "music" && this.#voiceSuppressedByMode) {
      this.#voiceSuppressedByMode = false;
      this.play();
    }
  }
  async selectMusic(id: string) {
    const playing =
      this.#state.ambience.status === "playing" || this.#state.ambience.status === "loading";
    this.ambience?.configure({ selectedTrackId: id });
    if (playing && this.#state.ambience.preferences.mode !== "voice") await this.ambience?.play();
  }
  stopAll() {
    this.#voiceSuppressedByMode = false;
    this.#musicPausedWithVoice = false;
    this.close();
    this.ambience?.stop();
  }
}
