import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import vm from "node:vm";
import ts from "typescript";
const compile = (name, globals = {}, imports = {}) => {
  const source = fs.readFileSync(
    new URL("../src/lib/" + name + ".ts", import.meta.url),
    "utf8",
  );
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const compiledModule = { exports: {} };
  vm.runInNewContext(code, {
    module: compiledModule,
    exports: compiledModule.exports,
    require: (name) => {
      if (!(name in imports)) throw new Error("Unexpected import: " + name);
      return imports[name];
    },
    ...globals,
  });
  return compiledModule.exports;
};
test("transcript merging deduplicates REST/live races and retains out-of-order messages", () => {
  const { mergeMessages } = compile("contracts");
  const message = (id, sentAt) => ({
    id,
    conversationId: "conversation",
    sender: "CUSTOMER",
    content: "Hello",
    sentAt,
  });
  const messages = mergeMessages(
    [message(2, "2026-10-07T10:00:02Z")],
    [message(1, "2026-10-07T10:00:01Z"), message(2, "2026-10-07T10:00:02Z")],
  );
  assert.deepEqual(
    Array.from(messages, (item) => item.id),
    [1, 2],
  );
});
test("API sends bearer authentication without cookies and handles normal 204 responses", async () => {
  let request;
  const api = compile(
    "api",
    {
      process: { env: {} },
      window: {},
      sessionStorage: { getItem: () => "test-token" },
      Headers,
      fetch: async (url, options) => {
        request = { url, options };
        return new Response(null, { status: 204 });
      },
    },
    {
      "./auth": {
        expireSession: () => {
          throw new Error("Unexpected expiry");
        },
      },
    },
  );
  assert.equal(
    await api.apiFetch("/queues/FRAUD/next", {
      method: "POST",
      headers: { "X-Test": "custom" },
    }),
    null,
  );
  assert.equal(request.url, "http://localhost:8080/api/v1/queues/FRAUD/next");
  assert.equal(request.options.credentials, "omit");
  assert.equal(
    request.options.headers.get("Authorization"),
    "Bearer test-token",
  );
  assert.equal(request.options.headers.get("X-Test"), "custom");
});
test("401 expires the session, while 403 and invalid login preserve error distinctions", async () => {
  let status = 403,
    expired = 0;
  const api = compile(
    "api",
    {
      process: { env: {} },
      window: {},
      sessionStorage: { getItem: () => "test-token" },
      Headers,
      fetch: async () =>
        new Response(
          JSON.stringify({
            code: status === 403 ? "ACCESS_DENIED" : "INVALID_CREDENTIALS",
            message: "Backend detail",
          }),
          { status },
        ),
    },
    {
      "./auth": {
        expireSession: () => {
          expired++;
        },
      },
    },
  );
  await assert.rejects(
    api.apiFetch("/cards/card/block"),
    (error) => error.status === 403 && error.code === "ACCESS_DENIED",
  );
  assert.equal(expired, 0);
  status = 401;
  await assert.rejects(api.apiFetch("/auth/login", { method: "POST" }));
  assert.equal(expired, 0);
  await assert.rejects(api.apiFetch("/auth/me"));
  assert.equal(expired, 1);
});
test("STOMP keeps all subscriptions across reconnects and does not restore removed ones", () => {
  let instance,
    token = "first-token";
  class FakeClient {
    connected = false;
    active = false;
    subscriptions = [];
    constructor(config) {
      instance = Object.assign(this, config);
    }
    activate() {
      this.active = true;
    }
    deactivate() {
      this.active = false;
      this.connected = false;
      return Promise.resolve();
    }
    subscribe(topic, receive) {
      const subscription = {
        topic,
        receive,
        removed: false,
        unsubscribe() {
          this.removed = true;
        },
      };
      this.subscriptions.push(subscription);
      return subscription;
    }
  }
  const stomp = compile(
    "stomp",
    {
      process: { env: {} },
      sessionStorage: { getItem: () => token },
      window: { dispatchEvent() {} },
      Event: class {
        constructor(type) {
          this.type = type;
        }
      },
    },
    { "@stomp/stompjs": { Client: FakeClient } },
  );
  const received = [];
  const stopQueue = stomp.subscribeTopic("/topic/queue/FRAUD", (event) =>
    received.push(event),
  );
  const stopChat = stomp.subscribeTopic("/topic/conversation/id", (event) =>
    received.push(event),
  );
  instance.connected = true;
  instance.onConnect();
  assert.equal(instance.subscriptions.length, 2);
  instance.beforeConnect();
  assert.equal(instance.connectHeaders.Authorization, "Bearer first-token");
  const frame = {
    body: JSON.stringify({ schemaVersion: 1, type: "MESSAGE_POSTED" }),
  };
  instance.subscriptions[1].receive(frame);
  instance.subscriptions[1].receive(frame);
  assert.equal(received.length, 2);
  stopQueue();
  assert.equal(instance.subscriptions[0].removed, true);
  instance.connected = false;
  instance.onWebSocketClose();
  token = "new-token";
  instance.beforeConnect();
  assert.equal(instance.connectHeaders.Authorization, "Bearer new-token");
  instance.connected = true;
  instance.onConnect();
  assert.equal(instance.subscriptions.length, 3);
  assert.equal(instance.subscriptions[2].topic, "/topic/conversation/id");
  stopChat();
  stomp.disconnectStomp();
  assert.equal(instance.active, false);
});
test("login notice explains an expired session only when the query says so", () => {
  const { sessionNotice } = compile(
    "auth",
    { URLSearchParams },
    { "./stomp": { disconnectStomp() {} } },
  );
  const expired = "Votre session a expiré. Reconnectez-vous.";
  assert.equal(sessionNotice("?expired=1"), expired);
  assert.equal(sessionNotice("?next=%2Fadvisor&expired=1"), expired);
  assert.equal(sessionNotice(""), null);
  assert.equal(sessionNotice("?expired=0"), null);
});
test("expireSession redirects to a login URL that shows the expired notice", () => {
  let target;
  const storage = { removeItem() {} };
  const auth = compile(
    "auth",
    {
      URLSearchParams,
      sessionStorage: storage,
      localStorage: storage,
      document: {},
      window: { location: { replace: (url) => (target = url) } },
    },
    { "./stomp": { disconnectStomp() {} } },
  );
  auth.expireSession();
  const url = new URL(target, "http://localhost");
  assert.equal(url.pathname, "/login");
  assert.equal(
    auth.sessionNotice(url.search),
    "Votre session a expiré. Reconnectez-vous.",
  );
});
test("supervision query sends only paging when no filter is set", () => {
  const { supervisionQuery } = compile("supervision", { URLSearchParams }, { "./presentation": compile("presentation") });
  assert.equal(
    supervisionQuery({ statuses: [], skill: "", q: "  ", from: "", to: "", page: 0 }),
    "page=0&size=20",
  );
});
test("supervision query repeats status, trims the search and drops values outside the contract", () => {
  const { supervisionQuery } = compile("supervision", { URLSearchParams }, { "./presentation": compile("presentation") });
  const params = new URLSearchParams(
    supervisionQuery({
      statuses: ["ESCALATED", "ACTIVE", "UNKNOWN"],
      skill: "WEATHER",
      q: "  DEMO-00418 ",
      from: "",
      to: "",
      page: 2,
      size: 500,
    }),
  );
  assert.deepEqual(params.getAll("status"), ["ESCALATED", "ACTIVE"]);
  assert.equal(params.get("skill"), null);
  assert.equal(params.get("q"), "DEMO-00418");
  assert.equal(params.get("page"), "2");
  assert.equal(params.get("size"), "100");
  assert.equal(
    new URLSearchParams(
      supervisionQuery({ statuses: [], skill: "FRAUD", q: "", from: "", to: "", page: 0, size: 0 }),
    ).get("size"),
    "1",
  );
});
test("supervision query converts the date range to ISO-8601 UTC and ignores invalid dates", () => {
  const { supervisionQuery } = compile("supervision", { URLSearchParams }, { "./presentation": compile("presentation") });
  const params = new URLSearchParams(
    supervisionQuery({
      statuses: [],
      skill: "FRAUD",
      q: "",
      from: "2026-10-10T08:30",
      to: "not-a-date",
      page: 0,
    }),
  );
  assert.equal(params.get("skill"), "FRAUD");
  assert.equal(params.get("from"), new Date("2026-10-10T08:30").toISOString());
  assert.match(params.get("from"), /Z$/);
  assert.equal(params.get("to"), null);
});
test("supervision query accepts every queue the interface labels", () => {
  const { supervisionQuery } = compile(
    "supervision",
    { URLSearchParams },
    { "./presentation": { skillLabel: { FRAUD: "Fraude", LOANS: "Prêts" } } },
  );
  const query = (skill) =>
    new URLSearchParams(
      supervisionQuery({ statuses: [], skill, q: "", from: "", to: "", page: 0 }),
    ).get("skill");
  assert.equal(query("LOANS"), "LOANS");
  assert.equal(query("CARDS"), null);
  assert.equal(query("toString"), null);
});
test("a date range is invalid only when its end is not after its start", () => {
  const { invalidRange } = compile(
    "supervision",
    { URLSearchParams },
    { "./presentation": { skillLabel: {} } },
  );
  assert.equal(invalidRange("2026-10-10T12:00", "2026-10-10T08:00"), true);
  assert.equal(invalidRange("2026-10-10T08:00", "2026-10-10T08:00"), true);
  assert.equal(invalidRange("2026-10-10T08:00", "2026-10-10T12:00"), false);
  assert.equal(invalidRange("2026-10-10T08:00", ""), false);
  assert.equal(invalidRange("", "2026-10-10T08:00"), false);
});
test("AI slot shows the unavailable states whatever the request does", () => {
  const { aiSlotState } = compile("ai");
  for (const request of ["pending", "done", "failed"]) {
    assert.equal(aiSlotState("soon", request), "unavailable-soon");
    assert.equal(aiSlotState("down", request), "unavailable-down");
  }
  assert.equal(aiSlotState("checking", "done"), "loading");
});
test("AI slot follows the request once the feature is available", () => {
  const { aiSlotState } = compile("ai");
  // A retry is the caller setting the request back to pending.
  assert.equal(aiSlotState("available", "pending"), "loading");
  assert.equal(aiSlotState("available", "done"), "ready");
  assert.equal(aiSlotState("available", "failed"), "error");
});
test("no AI feature claims to be available before its Spring façade exists", () => {
  const { AI_FEATURES, capabilityFor } = compile("ai");
  assert.deepEqual(
    Object.entries(AI_FEATURES).filter(([, ready]) => ready),
    [],
  );
  for (const health of [null, "UP", "DEGRADED", "DOWN", "UNREACHABLE"])
    assert.equal(capabilityFor("suggestion", health), "soon");
});
test("health can only downgrade a feature whose façade exists", () => {
  const { capabilityFor } = compile("ai");
  const flags = { suggestion: true, workforce: false, quality: false, simulation: false };
  assert.equal(capabilityFor("suggestion", null, flags), "checking");
  assert.equal(capabilityFor("suggestion", "UP", flags), "available");
  for (const health of ["DEGRADED", "DOWN", "UNREACHABLE"])
    assert.equal(capabilityFor("suggestion", health, flags), "down");
  assert.equal(capabilityFor("quality", "UP", flags), "soon");
});
// Test-only fixtures shaped like the provisional ai-service contracts (48afba8).
// The sentinel lets a grep of the production build prove no fixture shipped.
const SENTINEL = "CV_FIXTURE_SENTINEL_7f3a";
test("suggestion adapter keeps confidence, sources, tools and action, and rejects bad values", () => {
  const { adaptSuggestion } = compile("ai");
  const raw = {
    reply: "Je bloque votre carte. " + SENTINEL,
    intent: "FRAUD",
    confidence: 0.82,
    tool_calls: [{ tool: "get_customer", args: {}, result_summary: "Client trouvé", ok: true }],
    sources: [{ kb_article_id: "a1", score: 0.9 }, { score: 0.4 }],
    action: { type: "BLOCK_CARD", payload: { cardId: "c1" } },
    latency_ms: 840,
  };
  const view = adaptSuggestion(raw);
  assert.equal(view.reply, raw.reply);
  assert.equal(view.intent, "FRAUD");
  assert.equal(view.confidence, 0.82);
  assert.deepEqual(JSON.parse(JSON.stringify(view.sources)), [{ articleId: "a1", title: null, score: 0.9 }]);
  assert.deepEqual(JSON.parse(JSON.stringify(view.toolCalls)), [{ tool: "get_customer", ok: true, summary: "Client trouvé" }]);
  assert.equal(view.suggestedAction.type, "BLOCK_CARD");
  assert.equal(view.suggestedAction.payload.cardId, "c1");
  assert.equal(view.latencyMs, 840);
  const odd = adaptSuggestion({ reply: "Bonjour", intent: "WEATHER", confidence: 1.4, action: { type: "WIRE_MONEY" }, latency_ms: -3 });
  assert.equal(odd.intent, null);
  assert.equal(odd.confidence, null);
  assert.equal(odd.suggestedAction.type, "NONE");
  assert.equal(odd.latencyMs, null);
  assert.equal(odd.sources.length, 0);
  assert.equal(
    adaptSuggestion({ reply: "Bonjour", sources: [{ kb_article_id: 42, score: 0.5 }] }).sources[0].articleId,
    "42",
  );
  assert.equal(adaptSuggestion({ confidence: 0.5 }), null);
  assert.equal(adaptSuggestion("not an object"), null);
});
test("workforce adapter keeps the expected gain per metric and needs an action type", () => {
  const { adaptWorkforce } = compile("ai");
  const view = adaptWorkforce({
    type: "REASSIGN", from_pool: "CARDS", to_pool: "FRAUD", count: 2,
    reason: "File fraude saturée " + SENTINEL, expected_gain: { wait_seconds: -45, sla: 0.12, label: "x" },
  });
  assert.equal(view.action, "REASSIGN");
  assert.equal(view.fromPool, "CARDS");
  assert.equal(view.toPool, "FRAUD");
  assert.equal(view.count, 2);
  assert.deepEqual(JSON.parse(JSON.stringify(view.expectedGain)), { wait_seconds: -45, sla: 0.12 });
  const partial = adaptWorkforce({ type: "HOLD", count: -1 });
  assert.equal(partial.fromPool, null);
  assert.equal(partial.count, null);
  assert.equal(partial.reason, null);
  assert.equal(adaptWorkforce({ reason: "no type" }), null);
});
test("quality adapter turns scores into criteria and keeps evidence, flags and recommendations", () => {
  const { adaptQuality } = compile("ai");
  const view = adaptQuality({
    conversation_id: "conv-1", global_score: 7.5, scores: { empathy: 8, accuracy: 7, tone: "x" },
    explanation: "Bonne prise en charge " + SENTINEL,
    evidence: [{ criterion: "empathy", score: 8, evidence: "« Je comprends »" }, { score: 3 }],
    flags: { compliance: false }, recommendations: ["Reformuler", 4],
  });
  assert.equal(view.globalScore, 7.5);
  assert.deepEqual(JSON.parse(JSON.stringify(view.criteria)), [{ name: "empathy", score: 8 }, { name: "accuracy", score: 7 }]);
  assert.deepEqual(JSON.parse(JSON.stringify(view.evidence)), [{ criterion: "empathy", score: 8, text: "« Je comprends »" }]);
  assert.equal(view.flags.compliance, false);
  assert.deepEqual(JSON.parse(JSON.stringify(view.recommendations)), ["Reformuler"]);
  assert.equal(adaptQuality({ scores: {} }), null);
});
test("simulation adapter maps the simulated customer's turn and state", () => {
  const { adaptSimulationTurn } = compile("ai");
  const view = adaptSimulationTurn({
    content: "Ma carte est bloquée ! " + SENTINEL, status: "en_cours",
    state: { profile: "impatient", patience: 35, satisfaction: 120, objective: "débloquer la carte", objective_met: false },
  });
  assert.equal(view.status, "ONGOING");
  assert.equal(view.state.profile, "impatient");
  assert.equal(view.state.patience, 35);
  assert.equal(view.state.satisfaction, null);
  assert.equal(view.state.objectiveMet, false);
  assert.equal(adaptSimulationTurn({ content: null, status: "resolu", state: { profile: "calme" } }).status, "RESOLVED");
  assert.equal(adaptSimulationTurn({ content: "x", status: "en_cours" }), null);
  assert.equal(adaptSimulationTurn({ status: "toString", state: { profile: "calme" } }).status, null);
});
test("suggestion labels show confidence, latency and the proposed action in French", () => {
  const { confidenceLabel, latencyLabel, actionLabel } = compile("ai");
  assert.equal(confidenceLabel(0.82), "82 %");
  assert.equal(confidenceLabel(0.005), "1 %");
  assert.equal(confidenceLabel(null), "—");
  assert.equal(latencyLabel(840), "840 ms");
  assert.equal(latencyLabel(1240), "1,2 s");
  assert.equal(latencyLabel(999.6), "1 s");
  assert.equal(latencyLabel(null), "—");
  assert.equal(actionLabel("BLOCK_CARD"), "Bloquer la carte");
  assert.equal(actionLabel("APPLY_CREDIT"), "Geste commercial");
  assert.equal(actionLabel("NONE"), null);
});
test("using a suggestion keeps what the advisor typed and never exceeds the message limit", () => {
  const { draftWithSuggestion } = compile("ai");
  const reply = "je bloque votre carte.";
  assert.equal(draftWithSuggestion("", reply, 2000), reply);
  assert.equal(draftWithSuggestion("  ", reply, 2000), reply);
  assert.equal(draftWithSuggestion("Bonjour,", reply, 2000), "Bonjour, " + reply);
  // Using it twice does not insert it twice.
  assert.equal(draftWithSuggestion("Bonjour, " + reply, reply, 2000), "Bonjour, " + reply);
  const long = draftWithSuggestion("x".repeat(1990), "y".repeat(50), 2000);
  assert.equal(long.length, 2000);
  assert.ok(long.startsWith("x".repeat(1990)));
  // The cut never splits an emoji into an invalid half.
  const cut = draftWithSuggestion("x".repeat(1998), "😀😀", 2000);
  assert.equal(cut, "x".repeat(1998) + " ");
  assert.equal(cut.length, 1999);
});
test("AI slot waits idle while there is nothing to answer", () => {
  const { aiSlotState } = compile("ai");
  assert.equal(aiSlotState("available", "idle"), "idle");
  assert.equal(aiSlotState("soon", "idle"), "unavailable-soon");
});
test("suggestion sources keep a title when the façade sends one", () => {
  const { adaptSuggestion } = compile("ai");
  const view = adaptSuggestion({
    reply: "Voici la procédure.",
    sources: [
      { kb_article_id: "a1", score: 0.9, title: "Opposition carte bancaire" },
      { kb_article_id: "a2", score: 0.4 },
    ],
  });
  assert.equal(view.sources[0].title, "Opposition carte bancaire");
  assert.equal(view.sources[1].title, null);
});
test("a suggestion is requested again only when the customer writes something new", () => {
  const { suggestionKey } = compile("ai");
  const message = (id, sender, conversationId = "c1") => ({ id, sender, conversationId });
  const opened = [message(1, "CUSTOMER"), message(2, "ADVISOR")];
  const key = suggestionKey("c1", opened);
  assert.equal(suggestionKey("c1", [...opened, message(3, "ADVISOR")]), key);
  assert.notEqual(suggestionKey("c1", [...opened, message(4, "CUSTOMER")]), key);
  assert.notEqual(suggestionKey("c2", [message(1, "CUSTOMER", "c2")]), key);
  // Messages left over from another conversation never count.
  assert.equal(suggestionKey("c1", [...opened, message(9, "CUSTOMER", "c2")]), key);
  assert.equal(suggestionKey("c1", [message(2, "ADVISOR")]), null);
  assert.equal(suggestionKey(null, opened), null);
});
test("the suggestion request never reaches the API while the façade flag is off", async () => {
  const calls = [];
  const requests = compile("aiRequests", {}, {
    "./api": { apiFetch: async (...args) => { calls.push(args); return {}; } },
    "./ai": compile("ai"),
  });
  const off = { suggestion: false, workforce: false, quality: false, simulation: false };
  assert.equal(await requests.requestSuggestion("c1", { features: off }), null);
  assert.equal(calls.length, 0);
});
test("the suggestion request posts to the façade path and adapts the answer", async () => {
  const calls = [];
  let answer = { reply: "Je bloque votre carte. " + SENTINEL, confidence: 0.8, action: { type: "BLOCK_CARD" } };
  const requests = compile("aiRequests", {}, {
    "./api": { apiFetch: async (...args) => { calls.push(args); return answer; } },
    "./ai": compile("ai"),
  });
  const on = { suggestion: true, workforce: false, quality: false, simulation: false };
  const view = await requests.requestSuggestion("c1", { features: on });
  assert.equal(calls[0][0], "/conversations/c1/suggestion");
  assert.equal(calls[0][1].method, "POST");
  assert.equal(view.confidence, 0.8);
  assert.equal(view.suggestedAction.type, "BLOCK_CARD");
  answer = { confidence: 0.8 };
  await assert.rejects(requests.requestSuggestion("c1", { features: on }), /INVALID_SUGGESTION/);
});
test("contrast ratio follows WCAG relative luminance", () => {
  const { contrastRatio } = compile("contrast");
  assert.equal(contrastRatio("#000000", "#ffffff"), 21);
  assert.equal(contrastRatio("#ffffff", "#000000"), 21);
  // Audit tools truncate to two decimals: the landing nav read 3.49:1 before R4.1.
  assert.equal(
    Math.floor(contrastRatio("#7a8a81", "#fafbf7") * 100) / 100,
    3.49,
  );
  // The 4.5:1 boundary: #767676 is the lightest grey that passes on white.
  assert.ok(contrastRatio("#767676", "#ffffff") >= 4.5);
  assert.ok(contrastRatio("#777777", "#ffffff") < 4.5);
  assert.equal(contrastRatio("#fff", "#000"), 21);
});
test("tab keys move to the next, previous, first and last tab and wrap around", () => {
  const { tabKeyTarget } = compile("tabs");
  assert.equal(tabKeyTarget("ArrowRight", 0, 6), 1);
  assert.equal(tabKeyTarget("ArrowRight", 5, 6), 0);
  assert.equal(tabKeyTarget("ArrowLeft", 0, 6), 5);
  assert.equal(tabKeyTarget("ArrowLeft", 3, 6), 2);
  assert.equal(tabKeyTarget("Home", 4, 6), 0);
  assert.equal(tabKeyTarget("End", 1, 6), 5);
  assert.equal(tabKeyTarget("Enter", 1, 6), null);
  assert.equal(tabKeyTarget("ArrowDown", 1, 6), null);
});
// The stylesheet as the browser receives it: local imports inlined in order, comments removed.
const readStylesheet = (url) =>
  fs
    .readFileSync(url, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/@import\s+"(\.[^"]+)";/g, (_, file) =>
      readStylesheet(new URL(file, url)),
    );
const rules = (css) =>
  Array.from(css.matchAll(/([^{}]+)\{([^{}]*)\}/g), ([, selectors, body]) => ({
    // Statements such as @import "tailwindcss"; end with ";" before a selector.
    selectors: selectors
      .split(";")
      .pop()
      .split(",")
      .map((item) => item.trim()),
    body,
  }));
const tokens = (css) =>
  Object.fromEntries(
    rules(css)
      .filter((rule) => rule.selectors.includes(":root"))
      .flatMap((rule) =>
        Array.from(rule.body.matchAll(/(--[\w-]+):\s*([^;]+)/g), (m) => [
          m[1],
          m[2].trim(),
        ]),
      ),
  );
// The last colour the stylesheet gives a selector (rules inside @media included), tokens resolved.
const cssValue = (css, selector, property) => {
  const values = tokens(css);
  let value;
  for (const { selectors, body } of rules(css)) {
    if (!selectors.includes(selector)) continue;
    const match = body.match(
      new RegExp("(?:^|;|\\s)" + property + ":\\s*([^;]+)"),
    );
    if (!match) continue;
    const resolved = match[1].replace(
      /var\((--[\w-]+)\)/g,
      (_, name) => values[name] ?? "",
    );
    value = resolved.match(/#[0-9a-f]{3,6}\b/i)?.[0];
  }
  return value;
};
// Tokens used by colour-bearing properties but defined nowhere in :root.
const undefinedTokens = (css) => {
  // A token counts as defined wherever it is declared (e.g. a local unit).
  const defined = new Set(
    Array.from(css.matchAll(/(--[\w-]+)\s*:/g), (m) => m[1]),
  );
  const used = Array.from(
    css.matchAll(
      /(?:color|background|border|outline|shadow|fill)[\w-]*:[^;{}]*?var\((--[\w-]+)\)/g,
    ),
    (m) => m[1],
  );
  return [...new Set(used)].filter((name) => !defined.has(name));
};
test("the stylesheet reader follows local imports in order and resolves tokens", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cv-css-"));
  fs.writeFileSync(
    path.join(dir, "main.css"),
    '@import "tailwindcss";\n@import "./a.css";\n.x { color: #000; }\n',
  );
  fs.writeFileSync(
    path.join(dir, "a.css"),
    ":root { --ink: #123456; }\n/* note */\n.y { color: var(--ink); }\n.x { color: #fff; }\n",
  );
  const css = readStylesheet(pathToFileURL(path.join(dir, "main.css")));
  assert.equal(cssValue(css, ".y", "color"), "#123456");
  assert.equal(cssValue(css, ".x", "color"), "#000");
  assert.deepEqual(undefinedTokens(css), []);
  assert.deepEqual(undefinedTokens(css + ".z { color: var(--missing); }"), [
    "--missing",
  ]);
});
test("the stylesheet keeps text at 4.5:1 and focus rings at 3:1 on their surfaces", () => {
  const { contrastRatio } = compile("contrast");
  const css = readStylesheet(
    new URL("../src/app/globals.css", import.meta.url),
  );
  assert.deepEqual(undefinedTokens(css), []);
  const check = (selector, property, backgrounds, minimum) => {
    const colour = cssValue(css, selector, property);
    assert.ok(colour, `${selector} has no ${property}`);
    for (const background of backgrounds)
      assert.ok(
        contrastRatio(colour, background) >= minimum,
        `${selector} ${colour} on ${background}: ${contrastRatio(colour, background).toFixed(2)}`,
      );
  };
  check(".cv-eyebrow", "color", ["#fafbf7", "#f5f6f4"], 4.5);
  check(".cv-muted", "color", ["#ffffff", "#f5f6f4"], 4.5);
  check(".cv-system-message", "color", ["#ffffff"], 4.5);
  check(".cv-live-off", "color", ["#ffffff", "#f5f6f4"], 4.5);
  check(".cv-badge-gray", "color", ["#f0f3f4"], 4.5);
  check(".cv-badge-amber", "color", ["#fcf5e2"], 4.5);
  check(".cv-login-legal", "color", ["#fafbf8"], 4.5);
  check("a:focus-visible", "outline", ["#ffffff", "#fafbf7", "#f5f6f4"], 3);
  check(
    ".cv-sidebar :focus-visible",
    "outline-color",
    ["#142b39", "#2a4c50"],
    3,
  );
  const values = tokens(css);
  // The landing CTA band is a gradient of these three stops.
  const night = ["--lp-night-deep", "--lp-night", "--lp-night-2"].map(
    (name) => values[name],
  );
  check(".cv-landing-cta :focus-visible", "outline-color", night, 3);
  check(".cv-login-story :focus-visible", "outline-color", ["#163a35"], 3);
  // Landing (2026-10-11 mockup): text on the page, its mint tint and the cards.
  const landing = ["#fbfcf9", "#f2f8f4"];
  check(".cv-landing .cv-eyebrow", "color", landing, 4.5);
  check(".cv-hero-description", "color", landing, 4.5);
  check(".cv-landing h1 em", "color", landing, 4.5);
  check(".cv-feature-card p", "color", ["#ffffff", "#ecf7f1"], 4.5);
  check(".cv-role-card p", "color", ["#ffffff"], 4.5);
  check(".cv-role-card-link", "color", ["#ffffff"], 4.5);
  check(".cv-landing-cta .cv-eyebrow", "color", night, 4.5);
  // The green headline words are large text (≥ 24 px): 3:1 at the light end.
  for (const background of landing)
    assert.ok(
      contrastRatio(values["--lp-brand-light"], background) >= 3,
      `--lp-brand-light on ${background}`,
    );
  // White button text must pass on both ends of the landing gradient.
  for (const stop of ["--lp-brand-strong", "--lp-brand-soft"]) {
    assert.ok(values[stop], `${stop} is not defined`);
    assert.ok(
      contrastRatio("#ffffff", values[stop]) >= 4.5,
      `white on ${stop} ${values[stop]}`,
    );
  }
});
test("advisor rules: who can reply or abandon, and the customer name shown", () => {
  const advisor = compile(
    "advisor",
    {},
    { "./presentation": compile("presentation") },
  );
  const presentation = compile("presentation");
  assert.deepEqual(
    ["QUEUED", "ASSIGNED", "ACTIVE", "ESCALATED", "RESOLVED", "ABANDONED"].map(
      (status) => [
        advisor.canReply(status),
        advisor.canAbandon(status),
        advisor.canEscalate(status),
        advisor.canResolve(status),
      ],
    ),
    [
      [false, true, false, false],
      [true, true, false, false],
      [true, true, true, true],
      [true, false, false, false],
      [false, false, false, false],
      [false, false, false, false],
    ],
  );
  assert.equal(advisor.canReply(undefined), false);
  assert.equal(
    presentation.customerDisplayName({ firstName: "Amina", lastName: "Haddad" }),
    "Amina Haddad",
  );
  assert.equal(presentation.customerDisplayName(null), "Conversation client");
  assert.equal(
    presentation.customerIdsKey([
      { customerId: "b" },
      { customerId: "a" },
      { customerId: "b" },
      { customerId: undefined },
    ]),
    "a,b",
  );
});
test("advisor events: a posted message is kept only when complete, closed conversations leave the inbox", () => {
  const advisor = compile(
    "advisor",
    {},
    { "./presentation": compile("presentation") },
  );
  const event = {
    type: "MESSAGE_POSTED",
    conversationId: "c1",
    sender: "CUSTOMER",
    messageId: 7,
    content: "Bonjour",
    sentAt: "2026-10-11T09:00:00Z",
  };
  assert.deepEqual(
    { ...advisor.messageFromEvent(event) },
    {
      id: 7,
      conversationId: "c1",
      sender: "CUSTOMER",
      content: "Bonjour",
      sentAt: "2026-10-11T09:00:00Z",
    },
  );
  assert.equal(
    advisor.messageFromEvent({ ...event, type: "STATUS_CHANGED" }),
    null,
  );
  assert.equal(advisor.messageFromEvent({ ...event, messageId: null }), null);
  assert.equal(advisor.messageFromEvent({ ...event, content: null }), null);
  const list = [
    { id: "c1", status: "ASSIGNED" },
    { id: "c2", status: "ACTIVE" },
  ];
  assert.deepEqual(
    Array.from(advisor.withEventStatus(list, "c1", "ACTIVE"), (c) => c.status),
    ["ACTIVE", "ACTIVE"],
  );
  assert.deepEqual(
    Array.from(advisor.withEventStatus(list, "c2", "RESOLVED"), (c) => c.id),
    ["c1"],
  );
});
test("advisor notices name the queue in French", () => {
  const advisor = compile(
    "advisor",
    {},
    { "./presentation": compile("presentation") },
  );
  assert.equal(
    advisor.takeNextNotice("CARDS", true),
    "Contact pris en charge · Cartes bancaires",
  );
  assert.equal(
    advisor.takeNextNotice("FRAUD", false),
    "Aucun contact en attente dans la file Fraude.",
  );
  assert.equal(
    advisor.takeNextNotice("OTHER", false),
    "Aucun contact en attente dans la file OTHER.",
  );
});
test("error messages say « adresse e-mail », as the forms do", () => {
  const api = compile(
    "api",
    {
      process: { env: {} },
      window: {},
      sessionStorage: { getItem: () => null },
      Headers,
    },
    { "./auth": { expireSession: () => {} } },
  );
  const message = (code) => api.errorMessage(new api.ApiError(400, code, ""));
  assert.equal(
    message("INVALID_CREDENTIALS"),
    "Adresse e-mail ou mot de passe incorrect.",
  );
  assert.equal(
    message("EMAIL_ALREADY_USED"),
    "Cette adresse e-mail est déjà utilisée.",
  );
});
test("an alert names its customer, or shows a short reference until the name is known", () => {
  const { alertCustomerLabel } = compile(
    "supervision",
    { URLSearchParams },
    { "./presentation": compile("presentation") },
  );
  assert.equal(
    alertCustomerLabel("3646d864-0fd5-4333-8a6b-8fe326e745a7", "Amina Haddad"),
    "Client\u00a0: Amina Haddad",
  );
  assert.equal(
    alertCustomerLabel("3646d864-0fd5-4333-8a6b-8fe326e745a7", undefined),
    "Client · 3646d864",
  );
  // A live payload is not validated: a missing id must not break the page.
  assert.equal(alertCustomerLabel(undefined, undefined), "Client");
});
test("the landing nav marks the last section past the reading line, and the last one at the page end", () => {
  const { currentSection } = compile("landing");
  const at = (...tops) =>
    ["experience", "roles", "architecture"].map((id, i) => ({
      id,
      top: tops[i],
    }));
  // Hero on screen, no section reached yet: the first link stays marked.
  assert.equal(currentSection(at(700, 1600, 2600), 360, false), "experience");
  assert.equal(currentSection(at(-900, 100, 1100), 360, false), "roles");
  assert.equal(currentSection(at(-900, 360, 1100), 360, false), "roles");
  // A short last section never reaches the line: the page end marks it.
  assert.equal(currentSection(at(-2000, -900, 500), 360, true), "architecture");
  assert.equal(currentSection([], 360, false), null);
});
test("the login health line keeps its texts and names its state for the dot", () => {
  const { serviceStatus } = compile("login");
  const at = (status, unavailable) =>
    JSON.stringify(serviceStatus(status, unavailable));
  assert.equal(at(null, false), JSON.stringify({ state: "checking", text: "Vérification du service…" }));
  assert.equal(at("UP", false), JSON.stringify({ state: "up", text: "Service disponible" }));
  assert.equal(
    at("DEGRADED", false),
    JSON.stringify({ state: "degraded", text: "Service disponible · fonctions IA indisponibles" }),
  );
  assert.equal(at("DOWN", false), JSON.stringify({ state: "down", text: "Service indisponible" }));
  // A failed request wins over a stale status.
  assert.equal(at(null, true), JSON.stringify({ state: "down", text: "Service indisponible" }));
  assert.equal(at("UP", true), JSON.stringify({ state: "down", text: "Service indisponible" }));
});
