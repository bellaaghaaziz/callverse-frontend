import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/navigation", () => ({ navigateTo: vi.fn() }));
vi.mock("@/lib/stomp", () => ({ disconnectStomp: vi.fn() }));

import { clearSession, getToken, isSessionExpired, saveSession } from "@/lib/session";
import { logout } from "@/lib/auth";
import { navigateTo } from "@/lib/navigation";
import { disconnectStomp } from "@/lib/stomp";

const inOneHour = () => new Date(Date.now() + 3_600_000).toISOString();

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  document.cookie = "role=; Max-Age=0; path=/";
  vi.mocked(navigateTo).mockClear();
  vi.mocked(disconnectStomp).mockClear();
});

describe("session", () => {
  it("stores the token and exposes the role to the middleware cookie", () => {
    saveSession({ token: "tok", role: "SUPERVISOR", expiresAt: inOneHour() });

    expect(getToken()).toBe("tok");
    expect(document.cookie).toContain("role=SUPERVISOR");
  });

  it("writes the role cookie with SameSite=Lax and a lifetime matching the token", () => {
    const writes: string[] = [];
    const desc = Object.getOwnPropertyDescriptor(Document.prototype, "cookie")!;
    vi.spyOn(document, "cookie", "set").mockImplementation((v: string) => {
      writes.push(v);
      desc.set!.call(document, v);
    });

    saveSession({ token: "tok", role: "ADVISOR", expiresAt: inOneHour() });

    const roleCookie = writes.find((w) => w.startsWith("role="))!;
    expect(roleCookie).toMatch(/SameSite=Lax/);
    expect(roleCookie).toMatch(/Max-Age=(3599|3600)/);
    expect(roleCookie).toMatch(/path=\//);
  });

  it("treats a past expiresAt as expired", () => {
    saveSession({ token: "tok", role: "ADVISOR", expiresAt: new Date(Date.now() - 1).toISOString() });
    expect(isSessionExpired()).toBe(true);
  });

  it("clearSession removes the token, the role cookie and legacy keys", () => {
    saveSession({ token: "tok", role: "ADVISOR", expiresAt: inOneHour() });
    localStorage.setItem("jwt", "legacy");

    clearSession();

    expect(getToken()).toBeNull();
    expect(document.cookie).not.toContain("role=");
    expect(localStorage.getItem("jwt")).toBeNull();
  });
});

describe("logout", () => {
  it("closes the live connection, clears the session and returns to login", () => {
    saveSession({ token: "tok", role: "ADVISOR", expiresAt: inOneHour() });

    logout();

    expect(disconnectStomp).toHaveBeenCalledOnce();
    expect(getToken()).toBeNull();
    expect(navigateTo).toHaveBeenCalledWith("/login");
  });
});
