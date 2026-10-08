import { describe, expect, it } from "vitest";
import { MARK, MARK_ARCS, arcPath, pointOnMark } from "@/components/brand/markGeometry";

const dist = (p: { x: number; y: number }) => Math.hypot(p.x - MARK.cx, p.y - MARK.cy);

describe("CallVerse mark geometry", () => {
  it("has four arcs, one per skill queue", () => {
    expect(MARK_ARCS).toHaveLength(4);
  });

  it("puts every arc end on the ring", () => {
    for (const arc of MARK_ARCS) {
      expect(dist(pointOnMark(arc.startDeg))).toBeCloseTo(MARK.r, 2);
      expect(dist(pointOnMark(arc.endDeg))).toBeCloseTo(MARK.r, 2);
    }
  });

  it("keeps equal gaps between arcs and an opening centred on the right", () => {
    for (let i = 1; i < MARK_ARCS.length; i++) {
      expect(MARK_ARCS[i].startDeg - MARK_ARCS[i - 1].endDeg).toBeCloseTo(10, 6);
    }
    const first = MARK_ARCS[0].startDeg;
    const last = MARK_ARCS[MARK_ARCS.length - 1].endDeg;
    expect((first + (last - 360)) / 2).toBeCloseTo(0, 6); // opening centred on 0°, pointing right
  });

  it("draws an SVG arc path from start to end", () => {
    expect(arcPath(0, 90)).toBe(
      `M ${MARK.cx + MARK.r} ${MARK.cy} A ${MARK.r} ${MARK.r} 0 0 1 ${MARK.cx} ${MARK.cy + MARK.r}`,
    );
  });
});
