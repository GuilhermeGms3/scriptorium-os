import { createContext, useContext, useSyncExternalStore } from "react";
import { AudioEngine, EMPTY_AUDIO_SNAPSHOT } from "../../lib/audio/audio-engine";

export const AudioContext = createContext<AudioEngine | null>(null);
export function useAudio() {
  const engine = useContext(AudioContext);
  if (!engine) throw new Error("AudioProvider não está disponível.");
  const state = useSyncExternalStore(
    engine.subscribe,
    engine.getSnapshot,
    () => EMPTY_AUDIO_SNAPSHOT,
  );
  return { engine, state };
}
