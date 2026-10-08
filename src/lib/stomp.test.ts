import { describe, expect, it, vi } from "vitest";

const instances: { activate: ReturnType<typeof vi.fn>; deactivate: ReturnType<typeof vi.fn> }[] = [];

vi.mock("@stomp/stompjs", () => ({
  Client: vi.fn().mockImplementation(function (this: object) {
    const inst = { activate: vi.fn(), deactivate: vi.fn(), connectHeaders: {} };
    instances.push(inst);
    return inst;
  }),
}));

import { disconnectStomp, getStompClient } from "@/lib/stomp";

describe("stomp client lifecycle", () => {
  it("disconnect deactivates the shared client so the next user gets a fresh one", () => {
    const first = getStompClient();
    expect(getStompClient()).toBe(first);

    disconnectStomp();

    expect(instances[0].deactivate).toHaveBeenCalledOnce();
    const second = getStompClient();
    expect(second).not.toBe(first);
  });

  it("disconnect is a no-op when no client exists", () => {
    disconnectStomp();
    expect(() => disconnectStomp()).not.toThrow();
  });
});
