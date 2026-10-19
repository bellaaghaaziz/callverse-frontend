import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function load() {
  const source = fs.readFileSync(new URL("../src/lib/guided-tour.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const compiled = { exports: {} };
  vm.runInNewContext(code, { module: compiled, exports: compiled.exports });
  return compiled.exports;
}
test("guides cover each authenticated workspace and use unique, read-only steps", () => {
  const { tourForPath } = load();
  const scopes = [];
  for (const path of ["/advisor", "/client", "/client/comptes", "/client/messages", "/client/aide", "/supervisor", "/admin", "/advisor/ai", "/supervisor/ai", "/admin/ai"]) {
    const guide = tourForPath(path); assert(guide); scopes.push(guide.scope);
    assert(guide.steps.length >= 5);
    assert.equal(new Set(guide.steps.map(s => s.id)).size, guide.steps.length);
    assert.equal(guide.steps.at(-1).id, "help");
    for (const s of guide.steps) {
      assert(s.title && s.body && s.target);
      assert(!("adminTab" in s));
      assert(!("action" in s));
    }
  }
  assert.equal(new Set(scopes).size, scopes.length);
  assert.equal(tourForPath("/login"), null); assert.equal(tourForPath("/"), null);
  assert.equal(tourForPath("/supervisor/").scope, "supervisor");
});
test("completion is versioned and isolated by verified account, role and page", () => {
  const { tourStorageKey, TOUR_VERSION } = load();
  const user = { userId: "existing-account", role: "SUPERVISOR" };
  const key = tourStorageKey(user, "supervisor");
  assert(key.includes(`:v${TOUR_VERSION}:`));
  assert.notEqual(key, tourStorageKey({ ...user, userId: "new-account" }, "supervisor"));
  assert.notEqual(key, tourStorageKey({ ...user, role: "ADMIN" }, "supervisor"));
  assert.notEqual(key, tourStorageKey(user, "supervisor-ai"));
  assert.equal(tourStorageKey(null, "supervisor"), null);
  assert.equal(tourStorageKey({ userId: "id" }, "supervisor"), null);
});
test("old accounts start unseen, and skipping or completing prevents a new automatic tour", () => {
  const { hasSeenTour, markTourSeen } = load();
  const values = new Map();
  const storage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  assert.equal(hasSeenTour(storage, "existing-user"), false);
  markTourSeen(storage, "existing-user");
  assert.equal(hasSeenTour(storage, "existing-user"), true);
  assert.equal(values.get("existing-user"), "seen");
  assert.equal(hasSeenTour(storage, "another-user"), false);
});
test("blocked browser storage cannot break the app or repeatedly reopen a skipped guide", () => {
  const { hasSeenTour, markTourSeen } = load();
  const blocked = { getItem: () => { throw Error("blocked"); }, setItem: () => { throw Error("blocked"); } };
  assert.equal(hasSeenTour(blocked, "private-session"), false);
  markTourSeen(blocked, "private-session");
  assert.equal(hasSeenTour(blocked, "private-session"), true);
});
test("tour cards stay within desktop, mobile and short viewports even without a target", () => {
  const { tourLayout } = load();
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 240 }]) {
    for (const rect of [null, { x: 4, y: 4, width: 100, height: 40 }, { x: viewport.width - 100, y: viewport.height - 60, width: 96, height: 56 }, { x: 20, y: 20, width: viewport.width - 40, height: viewport.height - 40 }]) {
      const result = tourLayout(rect, viewport, { width: 370, height: 300 });
      assert(result.x >= 12 && result.y >= 12);
      assert(result.x + result.width <= viewport.width - 12);
      assert(result.y + Math.min(300, viewport.height - 24) <= viewport.height - 12);
    }
  }
});
