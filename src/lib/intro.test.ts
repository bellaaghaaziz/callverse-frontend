import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { INTRO_GUARD_SCRIPT, hasSeenIntro, markIntroSeen, shouldPlayIntro } from "@/lib/intro";

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("intro splash session rule", () => {
  it("plays on the first visit of a session when motion is allowed", () => {
    expect(shouldPlayIntro({ seen: false, reducedMotion: false })).toBe(true);
  });

  it("never plays twice in a session", () => {
    expect(shouldPlayIntro({ seen: true, reducedMotion: false })).toBe(false);
  });

  it("never plays when the user asked for reduced motion", () => {
    expect(shouldPlayIntro({ seen: false, reducedMotion: true })).toBe(false);
  });

  it("remembers that the intro was seen for this session", () => {
    expect(hasSeenIntro()).toBe(false);
    markIntroSeen();
    expect(hasSeenIntro()).toBe(true);
  });

  it("pre-paint guard hides the splash for a returning visitor before React loads", () => {
    markIntroSeen();
    delete document.documentElement.dataset.intro;
    new Function(INTRO_GUARD_SCRIPT)();
    expect(document.documentElement.dataset.intro).toBe("skip");
  });

  it("pre-paint guard leaves the splash for a first visit", () => {
    delete document.documentElement.dataset.intro;
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    new Function(INTRO_GUARD_SCRIPT)();
    expect(document.documentElement.dataset.intro).toBeUndefined();
    vi.unstubAllGlobals();
  });

  it("pre-paint guard is a constant with no interpolation", () => {
    expect(INTRO_GUARD_SCRIPT).not.toMatch(/\$\{/);
  });

  it("treats unavailable storage as already seen, so the splash cannot loop", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(hasSeenIntro()).toBe(true);
  });
});
