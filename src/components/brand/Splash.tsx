"use client";

import { useEffect, useState, type CSSProperties } from "react";
import AnimatedMark from "@/components/brand/AnimatedMark";
import { hasSeenIntro, markIntroSeen, prefersReducedMotion, shouldPlayIntro } from "@/lib/intro";
import { DURATION } from "@/lib/motion";

/** Four contacts, one per skill queue, arriving from the four edges. */
const STREAMS = [
  { fx: "0", fy: "-55vh", color: "#3DBE8B" },
  { fx: "55vw", fy: "0", color: "#1FA672" },
  { fx: "0", fy: "55vh", color: "#00965E" },
  { fx: "-55vw", fy: "0", color: "#007A4D" },
];

/**
 * Landing intro (design §3): streams converge, the mark draws, the core lights
 * up, then the stage fades to reveal the page already rendered underneath.
 * The choreography is CSS, so it plays from first paint; this component only
 * applies the session rule and the skip. Once per session, skippable (click
 * or any key), absent under reduced motion. The pre-paint guard in the root
 * layout hides it before paint for returning visitors.
 */
export default function Splash() {
  // "pending" = server render; "skipped" = never shown; "playing" -> "leaving" (fade) -> "done".
  const [phase, setPhase] = useState<"pending" | "playing" | "leaving" | "done" | "skipped">("pending");

  useEffect(() => {
    if (!shouldPlayIntro({ seen: hasSeenIntro(), reducedMotion: prefersReducedMotion() })) {
      setPhase("skipped");
      return;
    }
    markIntroSeen(); // a reload mid-animation must not replay it
    setPhase("playing");

    let fade = 0;
    const dismiss = () => {
      setPhase((p) => (p === "playing" ? "leaving" : p));
      window.clearTimeout(fade);
      fade = window.setTimeout(() => setPhase("done"), DURATION.exit * 1000);
    };
    // The choreography started at first paint (CSS), not at hydration: end it
    // relative to navigation start, so a slow device never sees a longer splash.
    const remaining = Math.max(0, (DURATION.signature + 0.35) * 1000 - performance.now());
    const timer = window.setTimeout(dismiss, remaining);
    window.addEventListener("keydown", dismiss, { once: true });
    window.addEventListener("pointerdown", dismiss, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(fade);
      window.removeEventListener("keydown", dismiss);
      window.removeEventListener("pointerdown", dismiss);
    };
  }, []);

  if (phase === "skipped" || phase === "done") return null;

  return (
    <div
      data-splash
      className={`cv-splash fixed inset-0 z-100 flex items-center justify-center overflow-hidden bg-(--night) ${phase === "leaving" ? "cv-splash-leave" : ""}`}
    >
      <span className="sr-only" role="status">
        Chargement de CallVerse
      </span>

      <div aria-hidden className="relative flex items-center justify-center">
        {STREAMS.map((s) => (
          <span
            key={s.color}
            className="cv-stream absolute h-2 w-2 rounded-full"
            style={{ background: s.color, boxShadow: `0 0 12px ${s.color}`, "--fx": s.fx, "--fy": s.fy } as CSSProperties}
          />
        ))}
        <div className="cv-stage" style={{ filter: "drop-shadow(0 0 18px rgba(61,190,139,0.35))" }}>
          <AnimatedMark size={112} tone="dark" delay={0.45} />
        </div>
      </div>
    </div>
  );
}
