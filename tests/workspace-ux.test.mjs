import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const load = name => {
  const source = fs.readFileSync(new URL(`../src/lib/${name}.ts`, import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const compiled = { exports: {} };
  vm.runInNewContext(code, { module: compiled, exports: compiled.exports, Intl, URLSearchParams, TextEncoder });
  return compiled.exports;
};
// Objects built inside the vm belong to another realm: compare their JSON shape.
const plain = value => JSON.parse(JSON.stringify(value));

test("every staff role gets its own pages, each banner item leading to a route of that role", () => {
  const { staffNav } = load("navigation");
  for (const [role, home] of [["Conseiller", "/advisor"], ["Superviseur", "/supervisor"], ["Analyste / Admin", "/admin"]]) {
    const items = staffNav(role);
    assert.ok(items.length >= (home === "/admin" ? 2 : 4), role);
    assert.equal(items[0].href.split("?")[0], home);
    for (const item of items) assert.ok(item.href.startsWith(home), `${role}: ${item.href}`);
    assert.equal(new Set(items.map(item => item.href)).size, items.length, role);
  }
  assert.ok(staffNav("Conseiller").some(item => item.href === "/advisor/clients"));
  assert.ok(staffNav("Superviseur").some(item => item.href === "/supervisor/clients"));
});

test("the current page is found by path, and an admin section by its query", () => {
  const { activeHref, staffNav } = load("navigation");
  assert.equal(activeHref(staffNav("Superviseur"), "/supervisor", ""), "/supervisor");
  assert.equal(activeHref(staffNav("Superviseur"), "/supervisor/conversations", ""), "/supervisor/conversations");
  assert.equal(activeHref(staffNav("Conseiller"), "/advisor/clients/", ""), "/advisor/clients");
  const admin = staffNav("Analyste / Admin");
  assert.equal(activeHref(admin, "/admin", ""), admin[0].href);
  assert.equal(activeHref(admin, "/admin", "?section=Clients"), "/admin");
  assert.equal(admin.filter(item => item.href.startsWith("/admin?")).length, 0, "sections stay in the admin tabs instead of a duplicate banner navigation");
});

test("a long navigation keeps its first items in the banner and moves the rest into « Plus »", () => {
  const { splitNav } = load("navigation");
  const items = Array.from({ length: 8 }, (_, i) => ({ href: "/a" + i, label: "L" + i }));
  const { visible, more } = splitNav(items, 5);
  assert.equal(visible.length, 5);
  assert.deepEqual(plain(more).map(item => item.href), ["/a5", "/a6", "/a7"]);
  assert.equal(splitNav(items.slice(0, 5), 5).more.length, 0);
  // A current item hidden in « Plus » swaps into the banner so the page you are on stays visible.
  const swapped = splitNav(items, 5, "/a7");
  assert.ok(plain(swapped.visible).some(item => item.href === "/a7"));
  assert.equal(swapped.visible.length, 5);
});

test("bar lengths are proportional to the largest value and never invisible when non-zero", () => {
  const { barWidths } = load("charts");
  assert.deepEqual(plain(barWidths([10, 5, 0], 200)), [200, 100, 0]);
  assert.deepEqual(plain(barWidths([0, 0], 200)), [0, 0]);
  assert.ok(barWidths([1000, 1], 200)[1] >= 4, "a tiny non-zero value keeps a visible 4px stub");
});

test("share segments add up to 100 % and keep each non-zero part readable", () => {
  const { shareSegments } = load("charts");
  const parts = shareSegments([{ key: "a", value: 6 }, { key: "b", value: 3 }, { key: "c", value: 1 }, { key: "d", value: 0 }]);
  assert.equal(Math.round(parts.reduce((sum, p) => sum + p.percent, 0)), 100);
  assert.equal(parts.find(p => p.key === "d").percent, 0);
  assert.equal(parts.find(p => p.key === "a").label, "60 %");
  assert.deepEqual(plain(shareSegments([{ key: "a", value: 0 }])), [{ key: "a", value: 0, percent: 0, label: "0 %" }]);
});

test("the trend line maps values onto a zero-based plot, newest on the right; an all-zero series sits mid-height", () => {
  const { trendPoints } = load("charts");
  const points = plain(trendPoints([0, 5, 10], 100, 50));
  assert.deepEqual(points.map(p => p.x), [0, 50, 100]);
  assert.equal(points[0].y, 50);
  assert.equal(points[2].y, 0);
  // Counts start at zero: a steady 4 is at the top of its own scale, not floating mid-way.
  assert.deepEqual(plain(trendPoints([4, 4], 100, 50)).map(p => p.y), [0, 0]);
  assert.deepEqual(plain(trendPoints([0, 0], 100, 50)).map(p => p.y), [25, 25]);
  assert.deepEqual(plain(trendPoints([7], 100, 50)), [{ x: 100, y: 25, value: 7 }]);
});

test("a live history keeps the latest samples only, and ignores an older or repeated snapshot", () => {
  const { pushSample } = load("charts");
  let history = [];
  for (let i = 0; i < 40; i++) history = pushSample(history, { at: `2026-10-19T10:${String(i).padStart(2, "0")}:00Z`, value: i }, 30);
  assert.equal(history.length, 30);
  assert.equal(history[29].value, 39);
  assert.equal(pushSample(history, { at: "2026-10-19T09:00:00Z", value: 99 }, 30), history);
  assert.equal(pushSample(history, history[29], 30), history);
});

test("spending is grouped by kind of operation, debits only, largest first, in plain words", () => {
  const { spendingByKind } = load("charts");
  const now = new Date("2026-10-19T12:00:00Z");
  const rows = [
    { type: "CARD_PAYMENT", amount: -64.2, status: "BOOKED", bookedAt: "2026-10-16T10:00:00Z" },
    { type: "CARD_PAYMENT", amount: -20, status: "BOOKED", bookedAt: "2026-10-15T10:00:00Z" },
    { type: "DIRECT_DEBIT", amount: -39.99, status: "BOOKED", bookedAt: "2026-10-11T10:00:00Z" },
    { type: "CARD_PAYMENT", amount: -249, status: "REJECTED", bookedAt: "2026-10-18T10:00:00Z" },
    { type: "TRANSFER_IN", amount: 1850, status: "BOOKED", bookedAt: "2026-10-07T10:00:00Z" },
    { type: "ATM_WITHDRAWAL", amount: -60, status: "BOOKED", bookedAt: "2026-08-01T10:00:00Z" },
  ];
  assert.deepEqual(plain(spendingByKind(rows, now, 30)), [
    { kind: "CARD_PAYMENT", label: "Paiements par carte", total: 84.2 },
    { kind: "DIRECT_DEBIT", label: "Prélèvements", total: 39.99 },
  ]);
});

test("the temporary password follows the bank's rules before it is sent, in French", () => {
  const { passwordProblem } = load("onboarding");
  assert.equal(passwordProblem("", "nadia@client.fr"), "Choisissez un mot de passe temporaire.");
  assert.equal(passwordProblem("Court1!", "nadia@client.fr"), "Au moins 12 caractères.");
  assert.equal(passwordProblem("aaaaaaaaaaaaaa", "nadia@client.fr"), "Pas un seul caractère répété.");
  assert.equal(passwordProblem("Nadia-2026-Bienvenue", "nadia@client.fr"), "Ne doit pas contenir le début de l’adresse e-mail.");
  assert.equal(passwordProblem("Bienvenue-2026!", "nadia@client.fr"), null);
});

test("a generated temporary password always passes those rules", () => {
  const values = new Uint32Array(64).map((_, i) => (i * 2654435761) >>> 0);
  const { generatePassword, passwordProblem } = load("onboarding");
  for (let i = 0; i < 20; i++) {
    const password = generatePassword(n => values[(i + n) % values.length]);
    assert.equal(passwordProblem(password, "nadia@client.fr"), null, password);
    assert.match(password, /[A-Z]/); assert.match(password, /[a-z]/); assert.match(password, /\d/);
  }
});
