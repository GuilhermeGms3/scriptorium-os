import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { INTRO_INIT } from "./intro-controller";

function opening(reduced = false, startsHidden = false) {
  let visibility = startsHidden ? "hidden" : "visible";
  const classes = new Set<string>();
  const listeners = new Map<
    string,
    (event: { key?: string; animationName?: string; preventDefault(): void }) => void
  >();
  const timers = new Map<number, { callback(): void; delay: number }>();
  let ordinal = 0;
  const window: {
    matchMedia(): { matches: boolean };
    __scriptoriumIntro?: { play(): void; skip(): void };
  } = { matchMedia: () => ({ matches: reduced }) };
  const context = {
    window,
    // Storage is deliberately absent: neither denied storage nor an old "seen" flag may gate entry.
    document: {
      get visibilityState() {
        return visibility;
      },
      documentElement: {
        classList: {
          contains: (name: string) => classes.has(name),
          add: (...names: string[]) => names.forEach((name) => classes.add(name)),
          remove: (...names: string[]) => names.forEach((name) => classes.delete(name)),
        },
        offsetWidth: 0,
      },
      querySelector: () => null,
      addEventListener: (
        name: string,
        listener: (event: { key?: string; animationName?: string; preventDefault(): void }) => void,
      ) => listeners.set(name, listener),
    },
    setTimeout: (callback: () => void, delay: number) => {
      timers.set(++ordinal, { callback, delay });
      return ordinal;
    },
    clearTimeout: (id: number) => timers.delete(id),
  };
  runInNewContext(INTRO_INIT, context);
  return {
    classes,
    window,
    event(name: string, event: { key?: string; animationName?: string } = {}) {
      listeners.get(name)?.({ ...event, preventDefault() {} });
    },
    show() {
      visibility = "visible";
      listeners.get("visibilitychange")?.({ preventDefault() {} });
    },
    tick(delay: number) {
      for (const [id, timer] of [...timers]) {
        if (timer.delay === delay) {
          timers.delete(id);
          timer.callback();
        }
      }
    },
  };
}

describe("opening on each document load", () => {
  it("starts on every document load without needing browser storage", () => {
    expect(opening().classes.has("intro-on")).toBe(true);
    expect(opening().classes.has("intro-on")).toBe(true);
    expect(INTRO_INIT).not.toMatch(/localStorage|sessionStorage/);
  });

  it("finishes after the actual CSS animation starts", () => {
    const page = opening();
    page.event("animationstart", { animationName: "intro-begin" });
    page.tick(4600);
    expect(page.classes.has("intro-out")).toBe(true);
    page.tick(1000);
    expect(page.classes.size).toBe(0);
  });

  it("allows keyboard skipping and manual replay", () => {
    const page = opening();
    page.event("keydown", { key: "Escape" });
    page.tick(1000);
    expect(page.classes.size).toBe(0);
    page.window.__scriptoriumIntro?.play();
    expect(page.classes.has("intro-on")).toBe(true);
  });

  it("releases the page if CSS animation events never arrive", () => {
    const page = opening();
    page.tick(12600);
    page.tick(1000);
    expect(page.classes.size).toBe(0);
  });

  it("waits frozen while the page starts hidden, and plays once it is on screen", () => {
    const page = opening(false, true);
    expect(page.classes.has("intro-on")).toBe(true);
    expect(page.classes.has("intro-wait")).toBe(true);
    // Nothing runs out while nobody can see it, not even the safety timer.
    page.tick(12600);
    page.tick(4600);
    expect(page.classes.has("intro-out")).toBe(false);

    page.show();
    expect(page.classes.has("intro-wait")).toBe(false);
    page.tick(4600);
    expect(page.classes.has("intro-out")).toBe(true);
    page.tick(1000);
    expect(page.classes.size).toBe(0);
  });

  it("respects reduced motion with the shorter static opening", () => {
    const page = opening(true);
    page.tick(1700);
    page.tick(400);
    expect(page.classes.size).toBe(0);
  });
});
