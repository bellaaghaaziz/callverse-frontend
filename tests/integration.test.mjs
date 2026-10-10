import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
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
  assert.equal(latencyLabel(null), "—");
  assert.equal(actionLabel("BLOCK_CARD"), "Bloquer la carte");
  assert.equal(actionLabel("APPLY_CREDIT"), "Geste commercial");
  assert.equal(actionLabel("NONE"), null);
});
test("using a suggestion keeps what the advisor typed and never exceeds the message limit", () => {
  const { draftWithSuggestion } = compile("ai");
  assert.equal(draftWithSuggestion("", "Je bloque votre carte."), "Je bloque votre carte.");
  assert.equal(draftWithSuggestion("  ", "Je bloque votre carte."), "Je bloque votre carte.");
  assert.equal(draftWithSuggestion("Bonjour,", "je bloque votre carte."), "Bonjour, je bloque votre carte.");
  const long = draftWithSuggestion("x".repeat(1990), "y".repeat(50));
  assert.equal(long.length, 2000);
  assert.ok(long.startsWith("x".repeat(1990)));
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
