import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/navigation", () => ({ navigateTo: vi.fn() }));
vi.mock("@/lib/stomp", () => ({ disconnectStomp: vi.fn() }));

import { ApiError, apiFetch } from "@/lib/api";
import { navigateTo } from "@/lib/navigation";
import { disconnectStomp } from "@/lib/stomp";
import { getToken, saveSession } from "@/lib/session";

const inOneHour = () => new Date(Date.now() + 3_600_000).toISOString();

function envelope(status: number, code: string) {
  return new Response(
    JSON.stringify({ timestamp: "t", status, code, message: "m", path: "/api/v1/x" }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

const fetchMock = vi.fn();

beforeEach(() => {
  sessionStorage.clear();
  document.cookie = "role=; Max-Age=0; path=/";
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.mocked(navigateTo).mockClear();
  vi.mocked(disconnectStomp).mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiFetch", () => {
  it("sends the session token as a Bearer header", async () => {
    saveSession({ token: "tok-1", role: "ADVISOR", expiresAt: inOneHour() });
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));

    await apiFetch("/queues");

    const [, init] = fetchMock.mock.calls[0];
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer tok-1");
  });

  it("never sends the token on an anonymous request such as login", async () => {
    saveSession({ token: "stale", role: "ADVISOR", expiresAt: inOneHour() });
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));

    await apiFetch("/auth/login", { method: "POST", anonymous: true });

    const [, init] = fetchMock.mock.calls[0];
    expect(new Headers(init.headers).has("Authorization")).toBe(false);
  });

  it("returns null on 204 No Content", async () => {
    saveSession({ token: "tok", role: "ADVISOR", expiresAt: inOneHour() });
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(apiFetch("/queues/CARDS/next", { method: "POST" })).resolves.toBeNull();
  });

  it("throws an ApiError carrying the backend code, status and path", async () => {
    saveSession({ token: "tok", role: "ADVISOR", expiresAt: inOneHour() });
    fetchMock.mockResolvedValue(envelope(409, "INVALID_STATE_TRANSITION"));

    const err = await apiFetch("/conversations/c1/resolve", { method: "POST" }).catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 409, code: "INVALID_STATE_TRANSITION", path: "/api/v1/x" });
    expect(err.message).toBe("INVALID_STATE_TRANSITION"); // pages read err.message as the code
  });

  it("ends the session and sends the user to login on a 401 with a session", async () => {
    saveSession({ token: "tok", role: "ADVISOR", expiresAt: inOneHour() });
    fetchMock.mockResolvedValue(envelope(401, "UNAUTHENTICATED"));

    await expect(apiFetch("/conversations/mine")).rejects.toMatchObject({ status: 401 });

    expect(getToken()).toBeNull();
    expect(document.cookie).not.toContain("role=");
    expect(disconnectStomp).toHaveBeenCalledOnce();
    expect(navigateTo).toHaveBeenCalledWith("/login?expired=1");
  });

  it("does not redirect on a 401 from an anonymous login attempt", async () => {
    fetchMock.mockResolvedValue(envelope(401, "INVALID_CREDENTIALS"));

    await expect(
      apiFetch("/auth/login", { method: "POST", anonymous: true }),
    ).rejects.toMatchObject({ status: 401, code: "INVALID_CREDENTIALS" });

    expect(navigateTo).not.toHaveBeenCalled();
  });

  it("keeps the session on a 403, because re-authenticating will not help", async () => {
    saveSession({ token: "tok", role: "ADVISOR", expiresAt: inOneHour() });
    fetchMock.mockResolvedValue(envelope(403, "ACCESS_DENIED"));

    await expect(apiFetch("/admin/users")).rejects.toMatchObject({ status: 403, code: "ACCESS_DENIED" });

    expect(getToken()).toBe("tok");
    expect(navigateTo).not.toHaveBeenCalled();
  });

  it("reports an unreachable server as NETWORK_ERROR", async () => {
    saveSession({ token: "tok", role: "ADVISOR", expiresAt: inOneHour() });
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(apiFetch("/queues")).rejects.toMatchObject({ status: 0, code: "NETWORK_ERROR" });
  });

  it("ends an expired session before calling the server", async () => {
    saveSession({ token: "tok", role: "ADVISOR", expiresAt: new Date(Date.now() - 1000).toISOString() });

    await expect(apiFetch("/queues")).rejects.toMatchObject({ status: 401, code: "SESSION_EXPIRED" });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(getToken()).toBeNull();
    expect(navigateTo).toHaveBeenCalledWith("/login?expired=1");
  });
});
