// Motion rules shared by the public pages. Tested in tests/motion.test.mjs.

export const INTRO_KEY = "callverse:intro-seen";

// Runs inline in <head>, before the first paint and before React: marks the page as scripted
// (so scroll reveals may start hidden) and decides whether the brand intro plays. Once per
// browser session, never under reduced motion, never when storage is blocked.
export const INTRO_SCRIPT = `(function(){var d=document.documentElement;d.classList.add("cv-js");try{var r=window.matchMedia("(prefers-reduced-motion: reduce)").matches;if(r||sessionStorage.getItem("${INTRO_KEY}")){d.classList.add("cv-intro-skip");}else{sessionStorage.setItem("${INTRO_KEY}","1");}}catch(e){d.classList.add("cv-intro-skip");}})();`;

// A number counting up to `target` over `duration` ms with an ease-out curve, as whole numbers.
export function countValue(target: number, elapsed: number, duration: number) {
  const t = Math.min(1, Math.max(0, elapsed / duration));
  const eased = 1 - Math.pow(1 - t, 3);
  return Math.min(target, Math.round(target * eased));
}
