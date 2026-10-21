import { describe, expect, it, vi, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { AudioProvider } from "../../components/audio/audio-context";
import { AudioMiniPlayer } from "../../components/audio/audio-player";
import { AudioEngine } from "./audio-engine";
import { createAudioItem, generationFingerprint, segmentLiteralText } from "./preparation";
import {
  AudioSessionSchema,
  type AudioProgressStorage,
  type AudioSession,
  type NarrationProvider,
  type NarrationSettings,
  type SpeechEvents,
} from "./contracts";
import { NativeSpeechProvider } from "./native-speech-provider";
import { BrowserAudioProgressStorage } from "./progress-storage";

class TestProvider implements NarrationProvider {
  readonly id = "test-local";
  readonly capabilities = {
    output: "device-speech",
    localOnly: true,
    pitch: false,
    rate: true,
    volume: true,
    exportAudio: false,
  } as const;
  events: SpeechEvents | undefined;
  spoken: string[] = [];
  cancel = vi.fn();
  pause = vi.fn();
  resume = vi.fn();
  voices() {
    return [{ id: "pt", name: "Português local", language: "pt-BR", local: true }];
  }
  onVoicesChanged() {
    return () => {};
  }
  speak(text: string, _language: string, _settings: NarrationSettings, events: SpeechEvents) {
    this.events = events;
    this.spoken.push(text);
    events.started();
  }
}
class MemoryStorage implements AudioProgressStorage {
  value: AudioSession | null = null;
  read() {
    return this.value;
  }
  write(value: AudioSession) {
    this.value = AudioSessionSchema.parse(value);
  }
}
const item = (text = "No princípio. Outra frase.") =>
  createAudioItem({
    title: "Texto pessoal",
    text,
    language: "pt-BR",
    source: { kind: "personal", id: "one" },
  });
function setup() {
  const provider = new TestProvider();
  const storage = new MemoryStorage();
  const engine = new AudioEngine(provider, storage);
  engine.initialize();
  return { engine, provider, storage };
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("literal narration preparation", () => {
  it("keeps punctuation, paragraphs, Hebrew, Greek and astral characters unchanged", () => {
    const text = 'λόγος בְּרֵאשִׁית. Olá!\n\nTexto "citado". 😀 '.repeat(100);
    const segments = segmentLiteralText(text);
    expect(segments.map((segment) => segment.spokenText).join("")).toBe(text);
    for (const segment of segments)
      expect(text.slice(segment.start, segment.end)).toBe(segment.originalText);
    expect(segments.every((segment) => segment.spokenText.length <= 600)).toBe(true);
  });
  it("does not split a surrogate pair", () => {
    const segments = segmentLiteralText("a".repeat(39) + "😀" + "b".repeat(60), 40);
    expect(segments[0]!.originalText).toBe("a".repeat(39));
    expect(segments[1]!.originalText.startsWith("😀")).toBe(true);
  });
  it("rejects empty, oversized and invalid segment limits", async () => {
    expect(() => segmentLiteralText("  ")).toThrow();
    expect(() => segmentLiteralText("a", 0)).toThrow();
    await expect(item("x".repeat(100_001))).rejects.toThrow("100 mil");
  });
  it("invalidates identity for changed source content and generation parameters", async () => {
    const a = await item("Um texto");
    const b = await item("Outro texto");
    expect(a.id).not.toBe(b.id);
    expect(await generationFingerprint(a, "native", "1", "pt", { rate: 1 })).not.toBe(
      await generationFingerprint(a, "native", "1", "pt", { rate: 2 }),
    );
    expect((await item("Um texto")).id).toBe(a.id);
  });
});
describe("single audio engine", () => {
  it("does not start another segment after a pause raced with an end event", async () => {
    const { engine, provider } = setup();
    engine.load(await item("Uma frase completa. ".repeat(90)));
    engine.play();
    engine.pause();
    provider.events!.ended();
    expect(provider.spoken).toHaveLength(1);
    expect(engine.getSnapshot().segmentIndex).toBe(1);
    expect(engine.getSnapshot().status).toBe("ready");
    engine.play();
    expect(provider.spoken).toHaveLength(2);
  });
  it("replays a completed reading from the beginning after reloading its source", async () => {
    const { engine, provider } = setup();
    const source = await item();
    engine.load(source);
    engine.play();
    provider.events!.ended();
    expect(engine.getSnapshot().status).toBe("ended");
    engine.load(source);
    engine.play();
    expect(provider.spoken.at(-1)).toBe(source.originalText);
    expect(engine.getSnapshot().offset).toBe(0);
  });
  it("plays, pauses, resumes, changes speed and closes without editing source", async () => {
    const { engine, provider } = setup();
    const source = await item();
    engine.load(source);
    engine.play();
    expect(engine.getSnapshot().status).toBe("playing");
    provider.events!.boundary(4);
    engine.pause();
    expect(provider.pause).toHaveBeenCalledOnce();
    engine.play();
    expect(provider.resume).toHaveBeenCalledOnce();
    engine.configure({ rate: 1.5 });
    expect(provider.spoken.at(-1)).toBe(source.originalText.slice(4));
    expect(source.originalText).toBe("No princípio. Outra frase.");
    engine.close();
    expect(engine.getSnapshot().item).toBeNull();
  });
  it("ignores a late event after switching content or cancellation", async () => {
    const { engine, provider } = setup();
    engine.load(await item());
    engine.play();
    const old = provider.events!;
    engine.load(await item("Novo texto"));
    engine.play();
    old.ended();
    old.failed("erro antigo");
    old.boundary(500);
    expect(engine.getSnapshot().item!.originalText).toBe("Novo texto");
    expect(engine.getSnapshot().status).toBe("playing");
    expect(engine.getSnapshot().offset).toBe(0);
    engine.close();
    provider.events!.ended();
    expect(engine.getSnapshot().status).toBe("idle");
  });
  it("segments long text and advances the same queue", async () => {
    const { engine, provider } = setup();
    const first = await item("Uma frase. ".repeat(100));
    const second = await item("Próxima leitura");
    engine.load(first);
    engine.enqueue(second);
    engine.play();
    for (let i = 0; i < first.segments.length; i++) provider.events!.ended();
    expect(engine.getSnapshot().item!.id).toBe(second.id);
    expect(engine.getSnapshot().queue).toHaveLength(0);
  });
  it("seeks segments, not fictitious seconds, and rejects invalid speed", async () => {
    const { engine, provider } = setup();
    const source = await item("Frase longa. ".repeat(150));
    engine.load(source);
    engine.play();
    engine.seekSegment(1);
    expect(provider.spoken.at(-1)).toBe(source.segments[1]!.spokenText);
    engine.configure({ rate: NaN });
    expect(engine.getSnapshot().settings.rate).toBe(1);
    engine.seekSegment(-5);
    expect(engine.getSnapshot().segmentIndex).toBe(0);
  });
  it("restores verified progress after a new engine, without autoplay", async () => {
    const { engine, provider, storage } = setup();
    const source = await item();
    engine.load(source);
    engine.play();
    provider.events!.boundary(4);
    engine.pause();
    const reloaded = new AudioEngine(provider, storage);
    reloaded.initialize();
    expect(reloaded.getSnapshot().item).toBeNull();
    reloaded.load(source);
    expect(reloaded.getSnapshot().offset).toBe(4);
    expect(reloaded.getSnapshot().status).toBe("ready");
  });
  it("does not restore old progress into changed text", async () => {
    const { engine, provider } = setup();
    engine.load(await item());
    engine.play();
    provider.events!.boundary(4);
    engine.pause();
    engine.load(await item("Texto alterado"));
    expect(engine.getSnapshot().offset).toBe(0);
  });
  it("handles absent provider, unavailable voice and recoverable provider errors", async () => {
    const none = new AudioEngine(null, null);
    none.initialize();
    none.load(await item());
    none.play();
    expect(none.getSnapshot().error).toContain("Nenhuma voz local");
    const { engine, provider } = setup();
    engine.load(await item());
    engine.play();
    provider.events!.failed("Falha recuperável");
    expect(engine.getSnapshot().status).toBe("error");
    engine.play();
    expect(engine.getSnapshot().status).toBe("playing");
  });
  it("keeps history bounded and never serializes original or spoken text", async () => {
    const { engine, storage } = setup();
    for (let i = 0; i < 25; i++) engine.load(await item(`Texto secreto ${i}`));
    expect(storage.value!.history).toHaveLength(20);
    expect(JSON.stringify(storage.value)).not.toContain("Texto secreto");
  });
  it("keeps playback possible when persistence is blocked or corrupt", async () => {
    const provider = new TestProvider();
    const engine = new AudioEngine(provider, {
      read() {
        throw new Error();
      },
      write() {
        throw new Error();
      },
    });
    engine.initialize();
    engine.load(await item());
    engine.play();
    expect(engine.getSnapshot().status).toBe("playing");
    expect(engine.getSnapshot().storageWarning).toBeTruthy();
  });
  it("unsubscribe does not stop playback when route subscribers unmount", async () => {
    const { engine, provider } = setup();
    const onChange = vi.fn();
    const unsubscribe = engine.subscribe(onChange);
    engine.load(await item());
    engine.play();
    unsubscribe();
    const count = onChange.mock.calls.length;
    provider.events!.boundary(4);
    expect(onChange.mock.calls).toHaveLength(count);
    expect(engine.getSnapshot().status).toBe("playing");
  });
  it("bounds and removes queued items", async () => {
    const { engine } = setup();
    const source = await item();
    for (let i = 0; i < 31; i++) engine.enqueue(source);
    expect(engine.getSnapshot().queue).toHaveLength(30);
    engine.removeQueued(0);
    expect(engine.getSnapshot().queue).toHaveLength(29);
  });
});

function browserSynthesis(voices: SpeechSynthesisVoice[]) {
  const synthesis = Object.assign(new EventTarget(), {
    paused: false,
    pending: false,
    speaking: false,
    onvoiceschanged: null,
    getVoices: () => voices,
    speak: vi.fn<(utterance: SpeechSynthesisUtterance) => void>(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
  });
  const makeUtterance = (text: string): SpeechSynthesisUtterance =>
    Object.assign(new EventTarget(), {
      text,
      lang: "",
      pitch: 1,
      rate: 1,
      volume: 1,
      voice: null,
      onboundary: null,
      onend: null,
      onerror: null,
      onmark: null,
      onpause: null,
      onresume: null,
      onstart: null,
    });
  return { synthesis, provider: new NativeSpeechProvider(synthesis, makeUtterance) };
}
const local: SpeechSynthesisVoice = {
  default: true,
  lang: "pt-BR",
  localService: true,
  name: "Local",
  voiceURI: "local",
};
const events = () => ({ started: vi.fn(), boundary: vi.fn(), ended: vi.fn(), failed: vi.fn() });
describe("native local provider privacy and errors", () => {
  it("excludes remote voices and refuses remote voice IDs", () => {
    const { provider, synthesis } = browserSynthesis([
      local,
      { ...local, localService: false, voiceURI: "remote" },
    ]);
    expect(provider.voices()).toHaveLength(1);
    const callbacks = events();
    provider.speak("private", "pt-BR", { voiceId: "remote", rate: 1, volume: 1 }, callbacks);
    expect(synthesis.speak).not.toHaveBeenCalled();
    expect(callbacks.failed).toHaveBeenCalledOnce();
  });
  it("refuses a voice in the wrong language", () => {
    const { provider, synthesis } = browserSynthesis([local]);
    const callbacks = events();
    provider.speak("English text", "en", { voiceId: "local", rate: 1, volume: 1 }, callbacks);
    expect(synthesis.speak).not.toHaveBeenCalled();
    expect(callbacks.failed).toHaveBeenCalledOnce();
  });
  it("times out an unavailable device without networking or credentials", () => {
    vi.useFakeTimers();
    const { provider } = browserSynthesis([local]);
    const callbacks = events();
    provider.speak("Texto", "pt-BR", { voiceId: "local", rate: 1, volume: 1 }, callbacks);
    vi.advanceTimersByTime(15_000);
    expect(callbacks.failed).toHaveBeenCalledOnce();
  });
  it("cancels a pending request and ignores its timeout", () => {
    vi.useFakeTimers();
    const { provider } = browserSynthesis([local]);
    const callbacks = events();
    provider.speak("Texto", "pt-BR", { voiceId: "local", rate: 1, volume: 1 }, callbacks);
    provider.cancel();
    vi.runAllTimers();
    expect(callbacks.failed).not.toHaveBeenCalled();
  });
  it("recovers synchronous device errors", () => {
    vi.useFakeTimers();
    const { provider, synthesis } = browserSynthesis([local]);
    synthesis.speak.mockImplementation(() => {
      throw new Error();
    });
    const callbacks = events();
    provider.speak("Texto", "pt-BR", { voiceId: "local", rate: 1, volume: 1 }, callbacks);
    expect(callbacks.failed).toHaveBeenCalledOnce();
    vi.runAllTimers();
    expect(callbacks.failed).toHaveBeenCalledOnce();
    const failedConstruction = new NativeSpeechProvider(synthesis, () => {
      throw new Error("Unsupported utterance");
    });
    const constructorCallbacks = events();
    failedConstruction.speak(
      "Texto",
      "pt-BR",
      { voiceId: "local", rate: 1, volume: 1 },
      constructorCallbacks,
    );
    expect(constructorCallbacks.failed).toHaveBeenCalledOnce();
  });
});
describe("browser storage and SSR", () => {
  it("validates persisted metadata instead of trusting arbitrary local data", () => {
    vi.stubGlobal("window", { localStorage: { getItem: () => '{"version":100}' } });
    expect(() => new BrowserAudioProgressStorage().read()).toThrow("incompatíveis");
  });
  it("renders the shell provider and hidden player without browser, TTS or SQLite initialization", () => {
    vi.stubGlobal("window", undefined);
    expect(renderToString(createElement(AudioProvider, null, createElement(AudioMiniPlayer)))).toBe(
      "",
    );
  });
});
