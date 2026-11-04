import type { NarrationProvider, NarrationSettings, SpeechEvents } from "./contracts";

/** Device voices only: remote voices are never silently used, even for public texts. */
export class NativeSpeechProvider implements NarrationProvider {
  readonly id = "native-local";
  readonly capabilities = {
    output: "device-speech",
    localOnly: true,
    pitch: false,
    rate: true,
    volume: true,
    exportAudio: false,
  } as const;
  #utterance: SpeechSynthesisUtterance | null = null;
  #generation = 0;
  #startTimer: ReturnType<typeof setTimeout> | undefined;
  constructor(
    private readonly synthesis: SpeechSynthesis,
    private readonly makeUtterance = (text: string) => new SpeechSynthesisUtterance(text),
  ) {}
  voices() {
    return this.synthesis
      .getVoices()
      .filter((voice) => voice.localService === true)
      .map((voice) => ({
        id: voice.voiceURI,
        name: voice.name,
        language: voice.lang,
        local: true,
      }));
  }
  onVoicesChanged(listener: () => void) {
    this.synthesis.addEventListener("voiceschanged", listener);
    return () => this.synthesis.removeEventListener("voiceschanged", listener);
  }
  speak(text: string, language: string, settings: NarrationSettings, events: SpeechEvents) {
    this.cancel();
    const voice = this.synthesis
      .getVoices()
      .find((voice) => voice.voiceURI === settings.voiceId && voice.localService === true);
    if (!voice || voice.lang.split(/[-_]/)[0] !== language.split(/[-_]/)[0]) {
      events.failed(
        "Escolha uma voz local compatível com o idioma do texto. Instale-a nas configurações de voz do dispositivo.",
      );
      return;
    }
    const generation = this.#generation;
    const current = () => generation === this.#generation && this.#utterance !== null;
    let utterance: SpeechSynthesisUtterance;
    try {
      utterance = this.makeUtterance(text);
    } catch {
      events.failed(
        "O dispositivo não conseguiu criar a narração. Confira as vozes instaladas e tente novamente.",
      );
      return;
    }
    this.#utterance = utterance;
    utterance.voice = voice;
    utterance.lang = language;
    utterance.rate = settings.rate;
    utterance.volume = settings.volume;
    utterance.onstart = () => {
      if (!current()) return;
      clearTimeout(this.#startTimer);
      events.started();
    };
    utterance.onboundary = (event) => {
      if (current()) events.boundary(event.charIndex);
    };
    utterance.onend = () => {
      if (current()) {
        clearTimeout(this.#startTimer);
        this.#utterance = null;
        events.ended();
      }
    };
    utterance.onerror = () => {
      if (current()) {
        this.cancel();
        events.failed(
          "Não foi possível narrar com esta voz. Tente novamente ou selecione outra voz local.",
        );
      }
    };
    this.#startTimer = setTimeout(() => {
      if (current()) {
        this.cancel();
        events.failed(
          "A voz não iniciou em 15 segundos. Confira as vozes instaladas e tente novamente.",
        );
      }
    }, 15_000);
    try {
      this.synthesis.resume();
      this.synthesis.speak(utterance);
    } catch {
      this.cancel();
      events.failed(
        "O dispositivo recusou a narração. Confira a voz selecionada e tente novamente.",
      );
    }
  }
  #unlocked = false;
  unlock() {
    if (this.#unlocked) return;
    this.#unlocked = true;
    // A silent utterance spoken inside the tap; later utterances may then start after an await.
    const primer = this.makeUtterance(" ");
    primer.volume = 0;
    this.synthesis.speak(primer);
  }
  cancel() {
    this.#generation++;
    clearTimeout(this.#startTimer);
    this.synthesis.cancel();
    this.#utterance = null;
  }
}
