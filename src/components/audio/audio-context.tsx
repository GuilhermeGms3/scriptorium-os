import { useEffect, useState, type ReactNode } from "react";
import { AudioEngine } from "../../lib/audio/audio-engine";
import { NativeSpeechProvider } from "../../lib/audio/native-speech-provider";
import { BrowserAudioProgressStorage } from "../../lib/audio/progress-storage";

import { AudioContext } from "./use-audio";
export function AudioProvider({ children }: { children: ReactNode }) {
  const [engine] = useState(
    () =>
      new AudioEngine(
        typeof window !== "undefined" && "speechSynthesis" in window
          ? new NativeSpeechProvider(window.speechSynthesis)
          : null,
        typeof window !== "undefined" ? new BrowserAudioProgressStorage() : null,
      ),
  );
  useEffect(() => {
    engine.initialize();
    const saveAndPause = () => engine.pause();
    window.addEventListener("pagehide", saveAndPause);
    return () => {
      window.removeEventListener("pagehide", saveAndPause);
      engine.dispose();
    };
  }, [engine]);
  return <AudioContext.Provider value={engine}>{children}</AudioContext.Provider>;
}
