import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const load = () => {
  const source = fs.readFileSync(new URL("../src/lib/customer.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const compiled = { exports: {} };
  vm.runInNewContext(code, { module: compiled, exports: compiled.exports, Intl, URLSearchParams });
  return compiled.exports;
};
// Objects built inside the vm belong to another realm: compare their JSON shape.
const plain = value => JSON.parse(JSON.stringify(value));

test("a customer's conversation is headed by the advisor and the request, never by their own name", () => {
  const { conversationHeading } = load();
  assert.deepEqual(
    plain(conversationHeading({ customerName: "Léa Dubois", counterpartName: "Karim Benali", subject: "Carte bancaire", skill: "CARDS" })),
    { title: "Carte bancaire", subtitle: "Karim Benali" },
  );
  assert.deepEqual(
    plain(conversationHeading({ customerName: "Léa Dubois", counterpartName: null, subject: "Suspicion de fraude", skill: "FRAUD" })),
    { title: "Suspicion de fraude", subtitle: "Assistant IA · conseiller sur demande" },
  );
  // An older backend without the new fields still never shows the customer's name.
  assert.deepEqual(
    plain(conversationHeading({ customerName: "Léa Dubois", advisorName: "Karim", skill: "CARDS" })),
    { title: "Cartes", subtitle: "Karim" },
  );
});

test("the open-conversation conflict gives back the id of the conversation to resume", () => {
  const { openConversationConflict } = load();
  const id = "3a9c22ae-8572-4cc5-9d8e-de55f567453f";
  assert.equal(openConversationConflict({ code: "CONVERSATION_ALREADY_OPEN",
    detail: `Conversation ${id} is still open: close or delete it before opening a new one.` }), id);
  assert.equal(openConversationConflict({ code: "CONVERSATION_ALREADY_OPEN", detail: "no id" }), "");
  assert.equal(openConversationConflict({ code: "VALIDATION_FAILED", detail: id }), null);
  assert.equal(openConversationConflict(new Error("network")), null);
});

test("the greeting follows the time of day and the customer's first name", () => {
  const { greeting } = load();
  assert.equal(greeting(new Date(2026, 9, 19, 9, 0), "Léa"), "Bonjour, Léa");
  assert.equal(greeting(new Date(2026, 9, 19, 19, 30), "Léa"), "Bonsoir, Léa");
  assert.equal(greeting(new Date(2026, 9, 19, 3, 0), "Léa"), "Bonsoir, Léa");
  assert.equal(greeting(new Date(2026, 9, 19, 12, 0), null), "Bonjour");
});

test("the total balance adds the euro accounts and ignores closed ones", () => {
  const { totalBalance } = load();
  assert.equal(totalBalance([
    { balance: 3420.15, currency: "EUR", status: "ACTIVE" },
    { balance: 12500, currency: "EUR", status: "ACTIVE" },
    { balance: 99, currency: "EUR", status: "CLOSED" },
    { balance: 50, currency: "USD", status: "ACTIVE" },
  ]), 15920.15);
  assert.equal(totalBalance([]), 0);
});

test("the customer navigation marks the current page, the home only on itself", () => {
  const { customerNav, isCurrent } = load();
  assert.deepEqual(Array.from(customerNav, item => item.href), ["/client", "/client/comptes", "/client/messages", "/client/aide"]);
  assert.equal(isCurrent("/client", "/client"), true);
  assert.equal(isCurrent("/client/comptes", "/client"), false);
  assert.equal(isCurrent("/client/messages/", "/client/messages"), true);
  assert.equal(isCurrent("/client/messages", "/client/comptes"), false);
});

test("the advisor is told only about deletions of conversations they hold", () => {
  const { deletionNotice } = load();
  const event = { type: "CONVERSATION_DELETED_BY_CUSTOMER", conversationId: "c1", skill: "CARDS" };
  assert.equal(deletionNotice(event, [{ id: "c1", customerName: "Léa Dubois" }]),
    "Léa Dubois a supprimé sa conversation. Elle est terminée et reste consultable dans votre historique.");
  assert.equal(deletionNotice(event, [{ id: "c1" }]),
    "Le client a supprimé sa conversation. Elle est terminée et reste consultable dans votre historique.");
  assert.equal(deletionNotice(event, [{ id: "c2" }]), null);
  assert.equal(deletionNotice({ ...event, type: "CONVERSATION_QUEUED" }, [{ id: "c1" }]), null);
});

test("plain-language request topics map to a service and a reason the backend knows", () => {
  const { requestTopics } = load();
  const codes = new Set(["ACCOUNTS", "CARDS", "CREDIT", "FRAUD"]);
  const intents = new Set(["BALANCE", "CARD", "CREDIT", "FRAUD", "ACCOUNT_CLOSURE", "OTHER"]);
  assert.ok(requestTopics.length >= 4);
  for (const topic of requestTopics) {
    assert.ok(codes.has(topic.skill), topic.label);
    assert.ok(intents.has(topic.intent), topic.label);
    assert.doesNotMatch(topic.label, /[A-Z_]{4,}/);
  }
});

test("the sign-out screen and the expired session read differently", () => {
  const { signOutNotice } = load();
  assert.equal(signOutNotice("?logout=1"), "Vous êtes bien déconnecté. À bientôt !");
  assert.equal(signOutNotice("?expired=1"), null);
  assert.equal(signOutNotice(""), null);
});
