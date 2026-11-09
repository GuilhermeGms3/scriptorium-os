import type { MusicChannel } from "./ambience-contracts";

/** One file channel owned by the global AudioEngine; never a React-mounted player. */
export class BrowserMusicChannel implements MusicChannel {
  #audio: HTMLAudioElement | undefined;
  #url: string | undefined;
  load(blob: Blob, events: Parameters<MusicChannel["load"]>[1]) {
    this.dispose();
    const audio = new Audio();
    this.#audio = audio;
    this.#url = URL.createObjectURL(blob);
    audio.src = this.#url;
    audio.preload = "metadata";
    audio.onended = events.ended;
    audio.onerror = events.failed;
    audio.ontimeupdate = () => events.position(audio.currentTime);
  }
  async play() {
    if (!this.#audio) throw new Error("Selecione uma música antes de reproduzir.");
    await this.#audio.play();
  }
  pause() {
    this.#audio?.pause();
  }
  configure(volume: number, loop: boolean) {
    if (this.#audio) {
      this.#audio.volume = volume;
      this.#audio.loop = loop;
    }
  }
  dispose() {
    if (this.#audio) {
      this.#audio.onended = this.#audio.onerror = this.#audio.ontimeupdate = null;
      this.#audio.pause();
      this.#audio.removeAttribute("src");
      this.#audio.load();
      this.#audio = undefined;
    }
    if (this.#url) {
      URL.revokeObjectURL(this.#url);
      this.#url = undefined;
    }
  }
}
