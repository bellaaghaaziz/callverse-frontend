import { describe, expect, it, vi } from "vitest";
import { singleFlight } from "@/lib/singleFlight";

describe("singleFlight", () => {
  it("ignores a second call while the first is still running (no double take-next)", async () => {
    let release!: () => void;
    const fn = vi.fn(() => new Promise<void>((r) => (release = r)));
    const guarded = singleFlight(fn);

    const first = guarded();
    const second = guarded();
    release();
    await first;
    await second;

    expect(fn).toHaveBeenCalledOnce();
  });

  it("accepts a new call once the previous one has finished, even after a failure", async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce(undefined);
    const guarded = singleFlight(fn);

    await expect(guarded()).rejects.toThrow("boom");
    await guarded();

    expect(fn).toHaveBeenCalledTimes(2);
  });
});
