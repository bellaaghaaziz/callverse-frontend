import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(fetch) {
  const code = ts.transpileModule(fs.readFileSync(new URL("../src/lib/reference-admin.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const compiled = { exports: {} };
  vm.runInNewContext(code, { module: compiled, exports: compiled.exports, URLSearchParams, require: name => {
    assert.equal(name, "./api"); return { apiFetch: fetch };
  } });
  return compiled.exports.referenceAdmin;
}

test("reference changes use real authenticated backend methods and preserve precise product/operational values", async () => {
  const calls = [], api = load(async (...args) => { calls.push(args); return {}; });
  const product = { code: "SAVINGS", name: "Livret", category: "SAVINGS", monthlyFee: 2.5, interestRate: .035, active: false };
  await api.saveProduct(null, product); await api.saveProduct("product/one", product);
  await api.saveSla("policy/one", { skill: "CARDS", targetSeconds: 45, targetRatio: .875, active: true });
  await api.saveRouting(null, { name: "Fraude", intent: "FRAUD", skill: "FRAUD", priority: 0, active: true });
  assert.deepEqual(calls.map(([path, options]) => [path, options.method]), [
    ["/admin/products", "POST"], ["/admin/products/product%2Fone", "PUT"],
    ["/admin/sla-policies/policy%2Fone", "PUT"], ["/admin/routing-rules", "POST"],
  ]);
  assert.deepEqual(JSON.parse(calls[1][1].body), product);
  assert.equal(JSON.parse(calls[2][1].body).targetRatio, .875);
  assert(calls.every(([, options]) => !options.headers));
});

test("knowledge edits and deletions retain the expected version to prevent overwriting simultaneous work", async () => {
  const calls = [], api = load(async (...args) => { calls.push(args); return {}; });
  const article = { category: "CARDS", title: "Opposition", content: "Procédure", tags: ["carte"], published: true, expectedVersion: 7 };
  await api.saveArticle("article/one", article); await api.deleteArticle("article/one", 7);
  assert.deepEqual(calls.map(([path, options]) => [path, options.method]), [
    ["/admin/knowledge-articles/article%2Fone", "PUT"], ["/admin/knowledge-articles/article%2Fone?expectedVersion=7", "DELETE"],
  ]);
  assert.equal(JSON.parse(calls[0][1].body).expectedVersion, 7);
});

test("reference searches encode literal user text and pass cancellation; backend business conflicts reach the editor", async () => {
  const calls = [], conflict = new Error("newer article version"), signal = new AbortController().signal;
  const api = load(async (...args) => { calls.push(args); if (args[1]?.method === "PUT") throw conflict; return []; });
  await api.products("  carte & épargne  ", signal); await api.articles("_fraude%", signal);
  await assert.rejects(api.saveArticle("one", {}), error => error === conflict);
  assert.equal(calls[0][0], "/admin/products?q=carte+%26+%C3%A9pargne");
  assert.equal(calls[1][0], "/admin/knowledge-articles?q=_fraude%25");
  assert.equal(calls[0][1].signal, signal);
});
