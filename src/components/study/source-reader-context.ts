import { createContext, useContext } from "react";
import type { ReadingSource } from "../../lib/application/reading-source";

export const SourceReaderContext = createContext<(source: ReadingSource) => void>(() => {
  throw new Error("Leitor contextual indisponível.");
});
export function useSourceReader() {
  return useContext(SourceReaderContext);
}
