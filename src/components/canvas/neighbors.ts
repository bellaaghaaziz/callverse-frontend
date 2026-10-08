export interface Point {
  x: number;
  y: number;
}

/** Particles for a viewport: proportional to its area, never more than 60. */
export function particleBudget(width: number, height: number): number {
  return Math.max(12, Math.min(60, Math.floor((width * height) / 24000)));
}

/**
 * Calls `visit(i, j, distance)` once for every pair closer than `maxDist`.
 * A uniform grid with cells of `maxDist` means each point only checks its own
 * and the 8 surrounding cells: about O(n) instead of the O(n²) all-pairs loop.
 */
export function forEachNeighborPair(
  points: readonly Point[],
  maxDist: number,
  visit: (i: number, j: number, distance: number) => void,
): void {
  const cells = new Map<string, number[]>();
  const cellOf = (p: Point) => [Math.floor(p.x / maxDist), Math.floor(p.y / maxDist)] as const;

  points.forEach((p, i) => {
    const [cx, cy] = cellOf(p);
    const key = `${cx},${cy}`;
    const bucket = cells.get(key);
    if (bucket) bucket.push(i);
    else cells.set(key, [i]);
  });

  points.forEach((p, i) => {
    const [cx, cy] = cellOf(p);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const bucket = cells.get(`${cx + dx},${cy + dy}`);
        if (!bucket) continue;
        for (const j of bucket) {
          if (j <= i) continue;
          const d = Math.hypot(p.x - points[j].x, p.y - points[j].y);
          if (d < maxDist) visit(i, j, d);
        }
      }
    }
  });
}
