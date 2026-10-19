// The customer's space: plain-language wording and the small rules behind its pages.
// No React here, so every rule is tested with node:test (tests/customer-space.test.mjs).

const SKILL_LABELS: Record<string, string> = {
  ACCOUNTS: "Comptes",
  CARDS: "Cartes",
  CREDIT: "Crédit",
  FRAUD: "Fraude",
};

export interface ConversationListItem {
  customerName?: string | null;
  advisorName?: string | null;
  counterpartName?: string | null;
  subject?: string | null;
  skill: string;
}

// Lead with the request, then show who can help. Never the customer's own name.
export function conversationHeading(item: ConversationListItem) {
  const fromNewBackend = item.counterpartName !== undefined;
  const advisor = fromNewBackend ? item.counterpartName : item.advisorName;
  return {
    title: item.subject || SKILL_LABELS[item.skill] || item.skill,
    subtitle: advisor || "Assistant IA · conseiller sur demande",
  };
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

// null: not this conflict. "": the conflict, but its message named no conversation.
export function openConversationConflict(error: unknown): string | null {
  const failure = error as { code?: string; detail?: string } | null;
  if (failure?.code !== "CONVERSATION_ALREADY_OPEN") return null;
  return failure.detail?.match(UUID)?.[0] ?? "";
}

export function greeting(now: Date, firstName?: string | null) {
  const hour = now.getHours();
  const word = hour >= 18 || hour < 5 ? "Bonsoir" : "Bonjour";
  return firstName ? `${word}, ${firstName}` : word;
}

export function totalBalance(accounts: { balance: number; currency: string; status: string }[]) {
  const cents = accounts
    .filter(account => account.currency === "EUR" && account.status !== "CLOSED")
    .reduce((sum, account) => sum + Math.round(account.balance * 100), 0);
  return cents / 100;
}

export const customerNav = [
  { href: "/client", label: "Accueil" },
  { href: "/client/comptes", label: "Mes comptes" },
  { href: "/client/messages", label: "Messagerie" },
  { href: "/client/aide", label: "Aide et suivi" },
] as const;

export function isCurrent(pathname: string, href: string) {
  const path = pathname.replace(/\/$/, "") || "/";
  return href === "/client" ? path === href : path === href || path.startsWith(href + "/");
}

// The advisor's pop-up when a customer removes a conversation the advisor holds.
export function deletionNotice(
  event: { type: string; conversationId: string },
  held: { id: string; customerName?: string | null }[],
) {
  if (event.type !== "CONVERSATION_DELETED_BY_CUSTOMER") return null;
  const conversation = held.find(item => item.id === event.conversationId);
  if (!conversation) return null;
  const who = conversation.customerName || "Le client";
  return `${who} a supprimé sa conversation. Elle est terminée et reste consultable dans votre historique.`;
}

// What a customer wants to talk about, in their words, and where the bank routes it.
export const requestTopics = [
  { id: "card", label: "Ma carte bancaire", hint: "Paiement refusé, plafond, opposition…", skill: "CARDS", intent: "CARD" },
  { id: "accounts", label: "Mes comptes et opérations", hint: "Solde, virement, prélèvement…", skill: "ACCOUNTS", intent: "BALANCE" },
  { id: "fraud", label: "Une opération que je ne reconnais pas", hint: "Paiement suspect, fraude…", skill: "FRAUD", intent: "FRAUD" },
  { id: "credit", label: "Un crédit ou un financement", hint: "Prêt, échéances, simulation…", skill: "CREDIT", intent: "CREDIT" },
  { id: "other", label: "Une autre demande", hint: "Toute autre question", skill: "ACCOUNTS", intent: "OTHER" },
] as const;

export function signOutNotice(search: string): string | null {
  return new URLSearchParams(search).get("logout") === "1"
    ? "Vous êtes bien déconnecté. À bientôt !"
    : null;
}
