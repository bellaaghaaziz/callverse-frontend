/**
 * The landing splash plays once per browser session, never under reduced
 * motion. Storage failures (private mode, blocked storage) count as "seen" so
 * the splash can never loop.
 */

const KEY = "cv_intro_seen";

export function hasSeenIntro(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

export function markIntroSeen(): void {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    // Storage unavailable: hasSeenIntro() already reports "seen".
  }
}

export function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function shouldPlayIntro({ seen, reducedMotion }: { seen: boolean; reducedMotion: boolean }): boolean {
  return !seen && !reducedMotion;
}

/**
 * Runs in <head> before the first paint, so a returning visitor never sees the
 * server-rendered splash flash. A compile-time constant: it interpolates no
 * data, so it is not an injection surface (and can be hashed for a CSP).
 */
export const INTRO_GUARD_SCRIPT =
  "try{if(sessionStorage.getItem('cv_intro_seen')==='1'||" +
  "(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches))" +
  "document.documentElement.dataset.intro='skip'}catch(e){document.documentElement.dataset.intro='skip'}";
