import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(fetch) {
  const source = fs.readFileSync(new URL("../src/lib/ai-workspace.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const compiled = { exports: {} };
  vm.runInNewContext(code, { module: compiled, exports: compiled.exports, require: name => {
    assert.equal(name, "./api"); return { apiFetch: fetch };
  }});
  return compiled.exports;
}
test("AI workspace uses authenticated Spring routes and never sends a service key", async () => {
  const calls = [];
  const { aiWorkspace } = load(async (...args) => { calls.push(args); return []; });
  const signal = new AbortController().signal;
  await aiWorkspace.options(signal); await aiWorkspace.runs(signal); await aiWorkspace.workforce();
  await aiWorkspace.run("run/one", signal); await aiWorkspace.transcript("run/one", signal);
  await aiWorkspace.quality("conversation/one", signal);
  assert.deepEqual(calls.map(c => c[0]), ["/simulation-runs/options", "/simulation-runs", "/supervision/workforce/recommendations", "/simulation-runs/run%2Fone", "/simulation-runs/run%2Fone/messages", "/supervision/conversations/conversation%2Fone/quality"]);
  assert.equal(calls[2][1].method, "POST");
  assert(calls.every(c => !c[1].headers));
  assert.equal(calls[3][1].signal, signal);
});
test("starting a simulation sends the explicit setup once and propagates refusal", async () => {
  const setup = { scenarioId: "scenario", strategyCode: "STATIC_FIFO", seed: 42, profile: "CALME", objective: "Carte perdue", patience: 100, satisfaction: 50, maxTurns: 6, customerSegment: "MASS", tenureMonths: 12 };
  let count = 0;
  const refusal = new Error("duplicate seed");
  const { aiWorkspace } = load(async (path, options) => {
    count++; assert.equal(path, "/simulation-runs"); assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), setup); throw refusal;
  });
  await assert.rejects(aiWorkspace.start(setup), e => e === refusal);
  assert.equal(count, 1);
});
test("polling ends for completed and failed runs", () => {
  const { running } = load(() => {});
  assert.equal(running({ status: "RUNNING" }), true);
  assert.equal(running({ status: "PENDING" }), true);
  assert.equal(running({ status: "COMPLETED" }), false);
  assert.equal(running({ status: "FAILED" }), false);
});
