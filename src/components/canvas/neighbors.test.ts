import { describe, expect, it } from "vitest";
import { forEachNeighborPair, particleBudget } from "@/components/canvas/neighbors";

function bruteForce(points: { x: number; y: number }[], max: number) {
  const pairs: string[] = [];
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++)
      if (Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y) < max) pairs.push(`${i}-${j}`);
  return pairs.sort();
}

describe("neighbour search for the particle background", () => {
  it("finds exactly the pairs a brute-force O(n²) search finds", () => {
    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const points = Array.from({ length: 200 }, () => ({ x: rand() * 1400, y: rand() * 900 }));

    const found: string[] = [];
    forEachNeighborPair(points, 110, (i, j) => found.push(i < j ? `${i}-${j}` : `${j}-${i}`));

    expect(found.sort()).toEqual(bruteForce(points, 110));
  });

  it("caps the particle count whatever the screen size", () => {
    expect(particleBudget(3840, 2160)).toBeLessThanOrEqual(60);
    expect(particleBudget(375, 667)).toBeGreaterThan(0);
  });
});
