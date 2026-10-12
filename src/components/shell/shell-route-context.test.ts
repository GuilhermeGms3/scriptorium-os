import { describe, expect, it } from "vitest";

import { supportsPassageInspector } from "./shell-route-context";

describe("supportsPassageInspector", () => {
  it.each(["/scripture/john/1", "/scripture/genesis/50", "/scripture/1-corinthians/13/"])(
    "aceita uma rota de capítulo: %s",
    (pathname) => {
      expect(supportsPassageInspector(pathname)).toBe(true);
    },
  );

  it.each(["/", "/scripture", "/library", "/study", "/knowledge", "/search"])(
    "não mostra o inspetor de passagem fora do leitor: %s",
    (pathname) => {
      expect(supportsPassageInspector(pathname)).toBe(false);
    },
  );
});
