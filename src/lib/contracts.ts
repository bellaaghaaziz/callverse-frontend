import type { components } from "@/shared/api-client/generated/callverse-api";
export type Schema = components["schemas"];
export type Role = Schema["CreateUserRequest"]["role"];
export type Conversation = Omit<
  Schema["Conversation"],
  "advisorId" | "assignedAt" | "endedAt" | "intent"
> & {
  advisorId?: string | null;
  assignedAt?: string | null;
  endedAt?: string | null;
  intent?: string | null;
};
export type Message = Schema["Message"];
export type Customer = Schema["CustomerResponse"];
export type LiveKpi = Omit<
  Schema["LiveKpi"],
  "averageWaitSeconds" | "slaRatio" | "abandonRate"
> & {
  averageWaitSeconds?: number | null;
  slaRatio?: number | null;
  abandonRate?: number | null;
};
export interface ConversationEvent {
  schemaVersion: 1;
  type: "MESSAGE_POSTED" | "STATUS_CHANGED";
  occurredAt: string;
  conversationId: string;
  status: Conversation["status"];
  messageId: number | null;
  sender: Message["sender"] | null;
  content: string | null;
  sentAt: string | null;
}
export interface QueueEvent {
  schemaVersion: 1;
  type: "CONVERSATION_QUEUED" | "CONVERSATION_LEFT_QUEUE";
  occurredAt: string;
  skill: string;
  conversationId: string;
  status: Conversation["status"];
  waiting: number;
}
export interface SupervisionAlert {
  schemaVersion: 1;
  type: "ESCALATION_RAISED" | "CARD_BLOCKED_FRAUD";
  occurredAt: string;
  customerId: string;
  conversationId: string | null;
  escalationId: string | null;
  cardId: string | null;
  cardLast4: string | null;
}
export function mergeMessages(
  previous: Message[],
  incoming: Message[],
): Message[] {
  const unique = new Map(previous.map((message) => [message.id, message]));
  incoming.forEach((message) => unique.set(message.id, message));
  return [...unique.values()].sort(
    (a, b) => Date.parse(a.sentAt) - Date.parse(b.sentAt) || a.id - b.id,
  );
}
export const roleHome: Record<Role, string> = {
  CUSTOMER: "/client",
  ADVISOR: "/advisor",
  SUPERVISOR: "/supervisor",
  ADMIN: "/admin",
};
export const money = (value: number, currency: string) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(value);
