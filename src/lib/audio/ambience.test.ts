import { afterEach, describe, expect, it, vi } from "vitest";
import { AmbienceController } from "./ambience-controller";
import {
  EMPTY_AMBIENCE,
  MusicTrackSchema,
  type MusicAssetStore,
  type MusicChannel,
  type MusicTrack,
} from "./ambience-contracts";
import { AudioEngine } from "./audio-engine";
import { createAudioItem } from "./preparation";
import { detectMusicType, prepareMusicImport } from "./music-import";
import type { NarrationProvider, SpeechEvents } from "./contracts";

const track = (id = "a".repeat(64)): MusicTrack =>
  MusicTrackSchema.parse({
    id,
    title: "Trilha pessoal",
    category: "Pessoal",
    duration: 60,
    sizeBytes: 32,
    mimeType: "audio/wav",
    originalName: "minha.wav",
    author: "Não informado",
    origin: "user-file",
    license: "private-unverified",
    playback: "personal-only",
    redistribution: false,
    mixExport: false,
  });
function fixture(preferences: unknown = null) {
  const tracks = [track(), track("b".repeat(64))];
  const assets: MusicAssetStore = {
    list: vi.fn(async () => [...tracks]),
    read: vi.fn(async () => new Blob([new Uint8Array(32)])),
    put: vi.fn(async (record) => record),
    update: vi.fn(async (record) => {
      tracks.splice(
        tracks.findIndex((entry) => entry.id === record.id),
        1,
        record,
      );
    }),
    remove: vi.fn(async (id) => {
      tracks.splice(
        tracks.findIndex((entry) => entry.id === id),
        1,
      );
    }),
  };
  const channel: MusicChannel = {
    load: vi.fn(),
    play: vi.fn(async () => {}),
    pause: vi.fn(),
    configure: vi.fn(),
    dispose: vi.fn(),
  };
  const settings = { read: vi.fn(() => preferences), write: vi.fn() };
  const music = new AmbienceController(assets, channel, settings);
  let events: SpeechEvents | undefined;
  const voice: NarrationProvider = {
    id: "test",
    capabilities: {
      output: "device-speech",
      localOnly: true,
      rate: true,
      volume: true,
      pitch: false,
      exportAudio: false,
    },
    voices: () => [{ id: "pt", name: "Voz local", language: "pt-BR", local: true }],
    onVoicesChanged: () => () => {},
    speak: vi.fn((_text, _lang, _settings, callbacks) => {
      events = callbacks;
      callbacks.started();
    }),
    cancel: vi.fn(),
  };
  const engine = new AudioEngine(voice, null, music);
  const initialize = async () => {
    engine.initialize();
    await vi.waitFor(() => expect(music.getSnapshot().available).toBe(true));
  };
  return { music, assets, channel, settings, engine, voice, initialize, events: () => events! };
}
afterEach(() => vi.restoreAllMocks());
describe("coordinated voice and ambience", () => {
  it("restores preferences and tracks without autoplay or file loading", async () => {
    const f = fixture({
      ...EMPTY_AMBIENCE.preferences,
      mode: "music",
      selectedTrackId: track().id,
    });
    await f.initialize();
    expect(f.channel.play).not.toHaveBeenCalled();
    expect(f.assets.read).not.toHaveBeenCalled();
    expect(f.engine.getSnapshot().ambience.preferences.mode).toBe("music");
  });
  it("handles corrupt preferences without stopping narration", async () => {
    const f = fixture({ version: 999 });
    await f.initialize();
    expect(f.music.getSnapshot().warning).toBeTruthy();
    expect(f.music.getSnapshot().preferences.mode).toBe("voice");
  });
  it("keeps the narration alive when musical storage is unavailable", async () => {
    const f = fixture();
    vi.mocked(f.assets.list).mockRejectedValue(new Error());
    f.engine.initialize();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(f.engine.getSnapshot().ambience.warning).toContain("indisponível");
    f.engine.load(
      await createAudioItem({
        title: "Leitura",
        text: "Texto original",
        language: "pt-BR",
        source: { kind: "personal", id: "x" },
      }),
    );
    f.engine.play();
    expect(f.engine.getSnapshot().status).toBe("playing");
  });
  it("starts both channels and swaps music without restarting the voice", async () => {
    const f = fixture();
    await f.initialize();
    await f.engine.selectMusic(track().id);
    f.engine.load(
      await createAudioItem({
        title: "Leitura",
        text: "Texto original",
        language: "pt-BR",
        source: { kind: "personal", id: "x" },
      }),
    );
    f.engine.play();
    f.engine.setSoundMode("mixed");
    await vi.waitFor(() => expect(f.music.getSnapshot().status).toBe("playing"));
    await f.engine.selectMusic("b".repeat(64));
    expect(f.voice.speak).toHaveBeenCalledTimes(1);
    expect(f.engine.getSnapshot().status).toBe("playing");
    expect(f.music.getSnapshot().preferences.selectedTrackId).toBe("b".repeat(64));
  });
  it("switches music-only then continues the same reading from where the voice stopped", async () => {
    const f = fixture();
    await f.initialize();
    await f.engine.selectMusic(track().id);
    f.engine.load(
      await createAudioItem({
        title: "Leitura",
        text: "Texto",
        language: "pt-BR",
        source: { kind: "personal", id: "x" },
      }),
    );
    const reading = f.engine.getSnapshot().item?.id;
    f.engine.play();
    vi.mocked(f.voice.cancel).mockClear();
    f.engine.setSoundMode("music");
    await vi.waitFor(() => expect(f.music.getSnapshot().status).toBe("playing"));
    // The voice stops (pause is unreliable on Android) and the reading waits where it was.
    expect(f.voice.cancel).toHaveBeenCalledOnce();
    expect(f.engine.getSnapshot().status).toBe("paused");
    f.engine.setSoundMode("mixed");
    expect(f.voice.speak).toHaveBeenCalledTimes(2);
    expect(f.engine.getSnapshot().item?.id).toBe(reading);
    f.engine.setSoundMode("voice");
    expect(f.music.getSnapshot().status).toBe("paused");
    expect(f.engine.getSnapshot().status).toBe("playing");
  });
  it("does not speak in music-only mode", async () => {
    const f = fixture();
    await f.initialize();
    f.engine.setSoundMode("music");
    f.engine.load(
      await createAudioItem({
        title: "Leitura",
        text: "Texto",
        language: "pt-BR",
        source: { kind: "personal", id: "x" },
      }),
    );
    f.engine.play();
    expect(f.voice.speak).not.toHaveBeenCalled();
    expect(f.engine.getSnapshot().error).toContain("Somente música");
  });
  it("applies volumes independently without cutting speech", async () => {
    const f = fixture();
    await f.initialize();
    f.engine.load(
      await createAudioItem({
        title: "Leitura",
        text: "Texto",
        language: "pt-BR",
        source: { kind: "personal", id: "x" },
      }),
    );
    f.engine.play();
    const cancels = vi.mocked(f.voice.cancel).mock.calls.length;
    f.music.configure({ volume: 0.12 });
    f.engine.configure({ volume: 0.7 });
    expect(f.voice.cancel).toHaveBeenCalledTimes(cancels);
    expect(f.voice.speak).toHaveBeenCalledOnce();
    expect(f.channel.configure).toHaveBeenLastCalledWith(0.12, true);
    expect(f.engine.getSnapshot().settings.volume).toBe(0.7);
    f.music.configure({ volume: NaN });
    expect(f.music.getSnapshot().preferences.volume).toBe(0.12);
  });
  it("can pause music together with voice or leave it playing", async () => {
    const f = fixture();
    await f.initialize();
    await f.engine.selectMusic(track().id);
    f.engine.setSoundMode("mixed");
    await vi.waitFor(() => expect(f.music.getSnapshot().status).toBe("playing"));
    f.engine.load(
      await createAudioItem({
        title: "Leitura",
        text: "Texto",
        language: "pt-BR",
        source: { kind: "personal", id: "x" },
      }),
    );
    f.engine.play();
    f.engine.pause();
    expect(f.music.getSnapshot().status).toBe("playing");
    f.engine.play();
    f.music.configure({ pauseWithVoice: true });
    f.engine.pause();
    expect(f.music.getSnapshot().status).toBe("paused");
    f.engine.play();
    await vi.waitFor(() => expect(f.music.getSnapshot().status).toBe("playing"));
  });
  it("persists loop settings and stops both channels on close-all", async () => {
    const f = fixture();
    await f.initialize();
    f.music.configure({ loop: false });
    expect(f.settings.write).toHaveBeenLastCalledWith(expect.objectContaining({ loop: false }));
    await f.engine.selectMusic(track().id);
    f.engine.setSoundMode("music");
    await vi.waitFor(() => expect(f.music.getSnapshot().status).toBe("playing"));
    f.engine.stopAll();
    expect(f.music.getSnapshot().status).toBe("idle");
    expect(f.engine.getSnapshot().item).toBeNull();
  });
  it("does not start a file that finished loading after pause or mode change", async () => {
    const f = fixture();
    await f.initialize();
    let release: (blob: Blob) => void = () => {};
    vi.mocked(f.assets.read).mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    f.music.configure({ mode: "music", selectedTrackId: track().id });
    const pending = f.music.play();
    f.music.pause();
    release(new Blob(["audio"]));
    await pending;
    expect(f.channel.play).not.toHaveBeenCalled();
    expect(f.music.getSnapshot().status).toBe("paused");
  });
  it("surfaces autoplay rejection and missing files as recoverable errors", async () => {
    const f = fixture();
    await f.initialize();
    f.music.configure({ mode: "music", selectedTrackId: track().id });
    vi.mocked(f.channel.play).mockRejectedValue(new Error("autoplay"));
    await f.music.play();
    expect(f.music.getSnapshot().status).toBe("error");
    vi.mocked(f.channel.play).mockResolvedValue();
    await f.music.play();
    expect(f.music.getSnapshot().status).toBe("playing");
    f.music.configure({ selectedTrackId: "b".repeat(64) });
    vi.mocked(f.assets.read).mockRejectedValue(new Error("missing"));
    await f.music.play();
    expect(f.music.getSnapshot().error).toBeTruthy();
  });
  it("renames and removes only an explicit local track", async () => {
    const f = fixture();
    await f.initialize();
    await f.music.rename(track().id, "Minha chuva", "Ambientes Naturais");
    expect(f.music.getSnapshot().tracks[0]!.title).toBe("Minha chuva");
    f.music.configure({ selectedTrackId: track().id });
    await f.music.remove(track().id);
    expect(f.music.getSnapshot().tracks).toHaveLength(1);
    expect(f.music.getSnapshot().preferences.selectedTrackId).toBeNull();
  });
});
describe("local file validation", () => {
  const wav = () => {
    const bytes = new Uint8Array(32);
    bytes.set(new TextEncoder().encode("RIFF"));
    bytes.set(new TextEncoder().encode("WAVE"), 8);
    return bytes;
  };
  it("recognizes actual signatures rather than trusting the extension", () => {
    expect(detectMusicType("sound.wav", "audio/wav", wav())).toBe("audio/wav");
    expect(detectMusicType("sound.mp3", "audio/mpeg", new TextEncoder().encode("ID3"))).toBe(
      "audio/mpeg",
    );
    expect(detectMusicType("sound.aac", "audio/aac", new Uint8Array([255, 241]))).toBe("audio/aac");
    expect(() =>
      detectMusicType("script.wav", "audio/wav", new TextEncoder().encode("<html>")),
    ).toThrow();
    expect(() => detectMusicType("sound.exe", "audio/wav", wav())).toThrow();
    expect(() => detectMusicType("sound.wav", "text/html", wav())).toThrow();
  });
  it("requires decoder confirmation, hashes bytes and marks personal rights honestly", async () => {
    const file = new File([wav()], "Minha faixa.wav", { type: "audio/wav" });
    const inspect = vi.fn(async () => 31.5);
    const first = await prepareMusicImport(file, inspect);
    const second = await prepareMusicImport(file, inspect);
    expect(first.track.id).toBe(second.track.id);
    expect(first.track.duration).toBe(31.5);
    expect(first.track.redistribution).toBe(false);
    expect(first.track.title).toBe("Minha faixa");
    await expect(
      prepareMusicImport(file, async () => {
        throw new Error("corrupt");
      }),
    ).rejects.toThrow("corrupt");
  });
  it("rejects empty files, cancelled imports and invalid duration", async () => {
    const inspect = vi.fn(async () => Infinity);
    const controller = new AbortController();
    controller.abort();
    await expect(prepareMusicImport(new File([], "x.wav"), inspect)).rejects.toThrow("50 MB");
    await expect(
      prepareMusicImport(new File([wav()], "x.wav"), inspect, controller.signal),
    ).rejects.toThrow("cancelada");
    await expect(prepareMusicImport(new File([wav()], "x.wav"), inspect)).rejects.toThrow();
  });
});
