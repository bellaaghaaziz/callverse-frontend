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
