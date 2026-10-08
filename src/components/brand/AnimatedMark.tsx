import type { CSSProperties } from "react";
import type { CallVerseMarkProps } from "@/components/brand/CallVerseMark";
import { CORE_COLOR, MARK, MARK_ARCS, arcPath } from "@/components/brand/markGeometry";

/**
 * The mark drawing itself: the four queue arcs trace in sequence, then the
 * core (the advisor) lights up. Pure CSS (keyframes in globals.css), so it
 * starts at first paint, before any JavaScript, and costs no bundle size.
 * Under reduced motion the global rule ends every animation at its final
 * frame: the finished mark.
 */
export default function AnimatedMark({ size = 120, tone = "dark", delay = 0, className }: CallVerseMarkProps & { delay?: number }) {
  return (
    <svg viewBox={`0 0 ${MARK.size} ${MARK.size}`} width={size} height={size} className={className} aria-hidden>
      {MARK_ARCS.map((arc, i) => (
        <path
          key={arc.startDeg}
          d={arcPath(arc.startDeg, arc.endDeg)}
          pathLength={1}
          fill="none"
          stroke={arc.color}
          strokeWidth={MARK.stroke}
          className="cv-draw"
          style={{ animationDelay: `${delay + i * 0.06}s` } as CSSProperties}
        />
      ))}
      <circle
        cx={MARK.cx}
        cy={MARK.cy}
        r={MARK.coreR}
        fill={CORE_COLOR[tone]}
        className="cv-core"
        style={{ animationDelay: `${delay + 0.32}s` } as CSSProperties}
      />
    </svg>
  );
}
