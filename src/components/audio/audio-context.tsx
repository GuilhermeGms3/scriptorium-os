import { useEffect, useState, type ReactNode } from "react";
import { AudioEngine } from "../../lib/audio/audio-engine";
import { NativeSpeechProvider } from "../../lib/audio/native-speech-provider";
import { BrowserAudioProgressStorage } from "../../lib/audio/progress-storage";
import {
  AmbienceController,
  BrowserAmbiencePreferences,
} from "../../lib/audio/ambience-controller";
import { BrowserMusicAssetStore } from "../../lib/audio/music-assets";
import { BrowserMusicChannel } from "../../lib/audio/browser-music-channel";

import { AudioContext } from "./use-audio";
export function AudioProvider({ children }: { children: ReactNode }) {
  const [engine] = useState(
    () =>
      new AudioEngine(
        typeof window !== "undefined" && "speechSynthesis" in window
          ? new NativeSpeechProvider(window.speechSynthesis)
          : null,
        typeof window !== "undefined" ? new BrowserAudioProgressStorage() : null,
        typeof window !== "undefined"
          ? new AmbienceController(
              new BrowserMusicAssetStore(),
              new BrowserMusicChannel(),
              new BrowserAmbiencePreferences(),
            )
          : null,
      ),
  );
  useEffect(() => {
    engine.initialize();
    const saveAndPause = () => {
      engine.pause();
      engine.ambience?.pause();
    };
    window.addEventListener("pagehide", saveAndPause);
    return () => {
      window.removeEventListener("pagehide", saveAndPause);
      engine.dispose();
    };
  }, [engine]);
  return <AudioContext.Provider value={engine}>{children}</AudioContext.Provider>;
}
