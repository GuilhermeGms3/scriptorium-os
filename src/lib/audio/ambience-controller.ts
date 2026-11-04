import {
  AmbiencePreferencesSchema,
  EMPTY_AMBIENCE,
  MusicTrackSchema,
  type AmbiencePreferences,
  type AmbienceSnapshot,
  type MusicAssetStore,
  type MusicChannel,
} from "./ambience-contracts";

export interface AmbiencePreferenceStore {
  read(): unknown;
  write(value: AmbiencePreferences): void;
}
export class BrowserAmbiencePreferences implements AmbiencePreferenceStore {
  read(): unknown {
    return JSON.parse(localStorage.getItem("scriptorium.ambience.v1") ?? "null");
  }
  write(value: AmbiencePreferences) {
    localStorage.setItem("scriptorium.ambience.v1", JSON.stringify(value));
  }
}
/** Logical channel B. Its lifecycle and mode transitions belong to AudioEngine. */
export class AmbienceController {
  #state = EMPTY_AMBIENCE;
  #listener: (state: AmbienceSnapshot) => void = () => {};
  #token = 0;
  #loadedId: string | null = null;
  constructor(
    readonly assets: MusicAssetStore,
    private readonly channel: MusicChannel,
    private readonly preferences: AmbiencePreferenceStore,
  ) {}
  onChange(listener: (state: AmbienceSnapshot) => void) {
    this.#listener = listener;
  }
  getSnapshot() {
    return this.#state;
  }
  #patch(patch: Partial<AmbienceSnapshot>) {
    this.#state = { ...this.#state, ...patch };
    this.#listener(this.#state);
  }
  async initialize() {
    const token = ++this.#token;
    let preferences = EMPTY_AMBIENCE.preferences;
    let warning: string | null = null;
    try {
      const stored = this.preferences.read();
      if (stored !== null) preferences = AmbiencePreferencesSchema.parse(stored);
    } catch {
      warning = "Preferências de ambiente indisponíveis. Os livros não foram alterados.";
    }
    try {
      const tracks = await this.assets.list();
      if (token !== this.#token) return;
      if (
        preferences.selectedTrackId &&
        !tracks.some((track) => track.id === preferences.selectedTrackId)
      ) {
        preferences = { ...preferences, selectedTrackId: null };
        warning = "A música selecionada não está mais disponível. Importe ou escolha outra trilha.";
      }
      this.#patch({ tracks, preferences, warning, available: true });
      // Intentionally no autoplay or file load during restoration.
    } catch {
      if (token === this.#token)
        this.#patch({
          available: false,
          warning: "Armazenamento musical indisponível. A narração continua funcionando.",
        });
    }
  }
  configure(patch: Partial<Omit<AmbiencePreferences, "version">>) {
    const parsed = AmbiencePreferencesSchema.safeParse({ ...this.#state.preferences, ...patch });
    if (!parsed.success) return;
    const selectedChanged = parsed.data.selectedTrackId !== this.#state.preferences.selectedTrackId;
    if (selectedChanged) {
      this.#token++;
      this.channel.dispose();
      this.#loadedId = null;
      this.#patch({ status: "idle", position: 0 });
    }
    this.#patch({ preferences: parsed.data, error: null });
    this.channel.configure(parsed.data.volume, parsed.data.loop);
    try {
      this.preferences.write(parsed.data);
    } catch {
      this.#patch({ warning: "Não foi possível salvar os ajustes de ambiente neste navegador." });
    }
  }
  async refresh() {
    this.#patch({ tracks: await this.assets.list() });
  }
  async play() {
    const { selectedTrackId, mode } = this.#state.preferences;
    if (mode === "voice") return;
    if (!selectedTrackId) {
      this.#patch({ error: "Escolha uma música ou importe seu arquivo." });
      return;
    }
    const token = ++this.#token;
    this.#patch({ status: "loading", error: null });
    try {
      if (this.#loadedId !== selectedTrackId) {
        const blob = await this.assets.read(selectedTrackId);
        if (token !== this.#token) return;
        this.channel.load(blob, {
          ended: () => {
            if (this.#loadedId === selectedTrackId) this.#patch({ status: "ended" });
          },
          failed: () => {
            if (this.#loadedId === selectedTrackId) {
              this.channel.pause();
              this.#patch({
                status: "error",
                error:
                  "A música não pôde ser reproduzida. Confira o arquivo ou importe-o novamente.",
              });
            }
          },
          position: (position) => {
            if (this.#loadedId === selectedTrackId) this.#patch({ position });
          },
        });
        this.#loadedId = selectedTrackId;
      }
      this.channel.configure(this.#state.preferences.volume, this.#state.preferences.loop);
      await this.channel.play();
      if (token !== this.#token) return;
      if (this.#state.status !== "error") this.#patch({ status: "playing" });
    } catch {
      if (token === this.#token)
        this.#patch({
          status: "error",
          error:
            "Não foi possível iniciar a música. Clique em Ouvir música para autorizar a reprodução ou tente outro arquivo.",
        });
    }
  }
  pause() {
    this.#token++;
    this.channel.pause();
    if (this.#loadedId || this.#state.status === "loading") this.#patch({ status: "paused" });
  }
  async rename(id: string, title: string, category: string) {
    const track = this.#state.tracks.find((track) => track.id === id);
    if (!track) throw new Error("Música não encontrada.");
    await this.assets.update(MusicTrackSchema.parse({ ...track, title, category }));
    await this.refresh();
  }
  async remove(id: string) {
    await this.assets.remove(id);
    if (this.#state.preferences.selectedTrackId === id) this.configure({ selectedTrackId: null });
    await this.refresh();
  }
  dispose() {
    this.#token++;
    this.channel.dispose();
    this.#loadedId = null;
  }
  stop() {
    this.dispose();
    this.#patch({ status: "idle", position: 0, error: null });
  }
}
