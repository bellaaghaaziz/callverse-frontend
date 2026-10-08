// @vitest-environment node
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

function request(path: string, role?: string) {
  const headers = role ? { cookie: `role=${role}` } : undefined;
  return new NextRequest(new URL(path, "http://localhost:3000"), { headers });
}

describe("middleware role guard", () => {
  it("sends a visitor without a role to login", () => {
    const res = middleware(request("/advisor"));
    expect(res.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("keeps a role on its own workspace", () => {
    const res = middleware(request("/admin", "ADVISOR"));
    expect(res.headers.get("location")).toBe("http://localhost:3000/advisor");
  });

  it("rejects an unknown role value instead of letting it through", () => {
    const res = middleware(request("/admin", "HACKER"));
    expect(res.headers.get("location")).toBe("http://localhost:3000/login");
    expect(res.headers.get("set-cookie")).toMatch(/role=;/);
  });

  it("lets the right role through", () => {
    const res = middleware(request("/advisor", "ADVISOR"));
    expect(res.headers.get("location")).toBeNull();
  });
});
