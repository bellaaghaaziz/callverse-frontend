/**
 * Geometry of the CallVerse mark ("Convergence"): four arcs, one per skill
 * queue, form an open C around a core dot, the advisor where contacts
 * converge. Shared by the static mark, the animated mark and the splash so
 * all three stay identical. Angles are in degrees, clockwise from 3 o'clock
 * (SVG convention).
 */

export const MARK = { size: 64, cx: 32, cy: 32, r: 22, stroke: 6, coreR: 5.5 } as const;

const FIRST_ARC_DEG = 40;
const ARC_SPAN_DEG = 62.5;
const GAP_DEG = 10;

/** Light to dark: the contact's colour deepens as it moves through the queues. */
const ARC_COLORS = ["#3DBE8B", "#1FA672", "#00965E", "#007A4D"] as const;

export interface MarkArc {
  startDeg: number;
  endDeg: number;
  color: string;
}

export const MARK_ARCS: readonly MarkArc[] = ARC_COLORS.map((color, i) => {
  const startDeg = FIRST_ARC_DEG + i * (ARC_SPAN_DEG + GAP_DEG);
  return { startDeg, endDeg: startDeg + ARC_SPAN_DEG, color };
});

const round = (v: number) => Math.round(v * 1000) / 1000;

export function pointOnMark(deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return { x: round(MARK.cx + MARK.r * Math.cos(rad)), y: round(MARK.cy + MARK.r * Math.sin(rad)) };
}

/** SVG path for the clockwise arc from startDeg to endDeg on the mark's ring. */
export function arcPath(startDeg: number, endDeg: number): string {
  const a = pointOnMark(startDeg);
  const b = pointOnMark(endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${MARK.r} ${MARK.r} 0 ${largeArc} 1 ${b.x} ${b.y}`;
}

export const CORE_COLOR = { light: "#007A4D", dark: "#3DBE8B" } as const;
