import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function setup(fetcher) {
  const storage = new Map([["jwt", "old-access"], ["refreshToken", "old-refresh"]]);
  let expired = 0;
  const code = ts.transpileModule(fs.readFileSync(new URL("../src/lib/api.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const compiled = { exports: {} };
  vm.runInNewContext(code, { module: compiled, exports: compiled.exports, process: { env: {} }, window: {}, Headers,
    sessionStorage: { getItem: key => storage.get(key) ?? null }, fetch: fetcher,
    require: name => { assert.equal(name, "./auth"); return { clearSession: () => storage.clear(), expireSession: () => { expired++; storage.clear(); }, storeSession: tokens => { storage.set("jwt", tokens.token); storage.set("refreshToken", tokens.refreshToken); } }; },
  });
  return { api: compiled.exports, storage, expired: () => expired };
}
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

test("concurrent expired requests rotate one refresh token and retry with the new bearer", async () => {
  let refreshes = 0, retries = 0;
  const { api, storage, expired } = setup(async (url, options) => {
    if (url.endsWith("/auth/refresh")) { refreshes++; await new Promise(resolve => setTimeout(resolve, 10)); return json({ token: "new-access", refreshToken: "new-refresh", expiresAt: "2026-10-19T12:00:00Z" }); }
    if (options.headers.get("Authorization") === "Bearer old-access") return json({ code: "UNAUTHENTICATED" }, 401);
    assert.equal(options.headers.get("Authorization"), "Bearer new-access"); retries++; return json({ value: 42 });
  });
  const results = await Promise.all([api.apiFetch("/auth/me"), api.apiFetch("/me/customer")]);
  assert.deepEqual(results, [{ value: 42 }, { value: 42 }]); assert.equal(refreshes, 1); assert.equal(retries, 2); assert.equal(storage.get("refreshToken"), "new-refresh"); assert.equal(expired(), 0);
});

test("a late refresh cannot restore a logged-out or replacement session", async () => {
  for (const replacement of [null, "replacement-access"]) {
    let finish;
    const waiting = new Promise(resolve => { finish = resolve; });
    const { api, storage, expired } = setup(() => waiting);
    const pending = api.refreshSession(); storage.clear();
    if (replacement) { storage.set("jwt", replacement); storage.set("refreshToken", "replacement-refresh"); }
    finish(json({ token: "new-access", refreshToken: "new-refresh" }));
    assert.equal(await pending, false); assert.equal(storage.get("jwt") ?? null, replacement); assert.equal(expired(), 0);
  }
});

test("network errors preserve refresh credentials for retry; rejected refresh sessions expire", async () => {
  let unavailable = true;
  const { api, storage, expired } = setup(async () => { if (unavailable) throw new TypeError("offline"); return json({ code: "UNAUTHENTICATED" }, 401); });
  await assert.rejects(api.refreshSession()); assert.equal(storage.get("refreshToken"), "old-refresh"); assert.equal(expired(), 0);
  unavailable = false; await assert.rejects(api.refreshSession()); assert.equal(expired(), 1); assert.equal(storage.size, 0);
});

test("logout clears browser credentials immediately and revokes the saved refresh session", async () => {
  let request;
  const { api, storage } = setup(async (url, options) => { request = { url, options }; assert.equal(storage.size, 0); return new Response(null, { status: 204 }); });
  await api.logoutSession(); assert.equal(request.url, "http://localhost:8080/api/v1/auth/logout"); assert.deepEqual(JSON.parse(request.options.body), { refreshToken: "old-refresh" }); assert.equal(request.options.credentials, "omit");
});

test("CSV downloads share bearer authentication and refresh handling without JSON parsing", async () => {
  const { api } = setup(async (_url, options) => { assert.equal(options.headers.get("Authorization"), "Bearer old-access"); return new Response("Date;Montant\n2026-10-18;25", { headers: { "Content-Type": "text/csv" } }); });
  assert.equal(await (await api.apiResponse("/me/statement?from=2026-10-01&to=2026-10-18")).text(), "Date;Montant\n2026-10-18;25");
});

test("registration stays public when the browser holds an old token", async () => {
  let refreshes = 0;
  const { api, expired } = setup(async (url, options) => {
    if (url.endsWith("/auth/refresh")) refreshes++;
    assert.equal(options.headers.has("Authorization"), false);
    return json({ code: "EMAIL_ALREADY_USED" }, 409);
  });
  await assert.rejects(api.apiFetch("/auth/register", { method: "POST", body: JSON.stringify({ email: "existing@example.test" }) }), error => error.code === "EMAIL_ALREADY_USED");
  assert.equal(refreshes, 0); assert.equal(expired(), 0);
});
