import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const load = () => {
  const source = fs.readFileSync(new URL("../src/lib/motion.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const compiled = { exports: {} };
  vm.runInNewContext(code, { module: compiled, exports: compiled.exports });
  return compiled.exports;
};

// Runs the inline intro script the way the browser does, before React, and returns the <html> classes.
function runIntro({ seen = false, reduced = false, storageThrows = false } = {}) {
  const { INTRO_SCRIPT, INTRO_KEY } = load();
  const classes = new Set();
  const store = new Map(seen ? [[INTRO_KEY, "1"]] : []);
  const sessionStorage = {
    getItem: key => { if (storageThrows) throw new Error("blocked"); return store.get(key) ?? null; },
    setItem: (key, value) => { if (storageThrows) throw new Error("blocked"); store.set(key, value); },
  };
  vm.runInNewContext(INTRO_SCRIPT, {
    document: { documentElement: { classList: { add: (...names) => names.forEach(n => classes.add(n)) } } },
    window: { matchMedia: query => ({ matches: reduced && query.includes("prefers-reduced-motion") }) },
    sessionStorage,
  });
  return { classes, store, INTRO_KEY };
}

test("the brand intro plays on the first page of a visit and is remembered for the session", () => {
  const first = runIntro();
  assert.ok(first.classes.has("cv-js"));
  assert.ok(!first.classes.has("cv-intro-skip"));
  assert.equal(first.store.get(first.INTRO_KEY), "1");
});

test("the intro is skipped once seen, and never plays for reduced motion", () => {
  assert.ok(runIntro({ seen: true }).classes.has("cv-intro-skip"));
  const reduced = runIntro({ reduced: true });
  assert.ok(reduced.classes.has("cv-intro-skip"));
  assert.ok(reduced.classes.has("cv-js"));
});

test("blocked storage (private mode) still lets the page load, without the intro", () => {
  const { classes } = runIntro({ storageThrows: true });
  assert.ok(classes.has("cv-js"));
  assert.ok(classes.has("cv-intro-skip"));
});

test("counters ease out to the exact target and never overshoot", () => {
  const { countValue } = load();
  assert.equal(countValue(20, 0, 1200), 0);
  assert.equal(countValue(20, 1200, 1200), 20);
  assert.equal(countValue(20, 5000, 1200), 20);
  const half = countValue(20, 600, 1200);
  assert.ok(half > 10 && half < 20, `ease-out is ahead of linear at half time: ${half}`);
  let previous = 0;
  for (let t = 0; t <= 1200; t += 100) {
    const value = countValue(4, t, 1200);
    assert.ok(Number.isInteger(value) && value >= previous && value <= 4);
    previous = value;
  }
});
