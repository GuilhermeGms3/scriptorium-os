import { describe, expect, it } from "vitest";
import { runInNewContext } from "node:vm";
import { parseTheme, resolveTheme, THEME_INIT, THEMES } from "./theme";

describe("reading environments", () => {
  it.each(THEMES)("keeps $id consistent before first paint and after hydration", ({ id }) => {
    for (const prefersDark of [true, false]) {
      const root = {
        dataset: {} as Record<string, string>,
        classList: { toggle: (_name: string, _enabled: boolean) => {} },
      };
      let dark = false;
      root.classList.toggle = (_name, enabled) => {
        dark = enabled;
      };
      runInNewContext(THEME_INIT, {
        localStorage: { getItem: () => id },
        document: { documentElement: root },
        matchMedia: () => ({ matches: prefersDark }),
      });
      expect(root.dataset["theme"]).toBe(resolveTheme(id, prefersDark));
      expect(dark).toBe(resolveTheme(id, prefersDark) !== "light");
    }
  });
  it("uses system preference for old, missing or corrupted values", () => {
    expect(parseTheme(null)).toBe("system");
    expect(parseTheme("sepia-old")).toBe("system");
    expect(resolveTheme(parseTheme({}), true)).toBe("dark");
  });
});
