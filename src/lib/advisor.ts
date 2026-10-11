import type {
  Conversation,
  ConversationEvent,
  Customer,
  Message,
} from "./contracts";
import { skillLabel } from "./presentation";

// The advisor can write while the conversation is held, live or escalated.
export const canReply = (status?: string) =>
  !!status && ["ASSIGNED", "ACTIVE", "ESCALATED"].includes(status);

// « Terminer — client parti » applies until the conversation is escalated or closed.
export const canAbandon = (status?: string) =>
  !!status && ["QUEUED", "ASSIGNED", "ACTIVE"].includes(status);

export const customerDisplayName = (
  customer: Pick<Customer, "firstName" | "lastName"> | null,
) =>
  customer
    ? customer.firstName + " " + customer.lastName
    : "Conversation client";

// One stable key per set of customers, so their names load once per change.
export const customerIdsKey = (
  conversations: Pick<Conversation, "customerId">[],
) => [...new Set(conversations.map((c) => c.customerId))].sort().join(",");

// A live MESSAGE_POSTED event becomes a transcript message only when complete.
export function messageFromEvent(event: ConversationEvent): Message | null {
  if (
    event.type !== "MESSAGE_POSTED" ||
    !event.sender ||
    event.messageId === null ||
    event.content === null ||
    !event.sentAt
  )
    return null;
  return {
    id: event.messageId,
    conversationId: event.conversationId,
    sender: event.sender,
    content: event.content,
    sentAt: event.sentAt,
  };
}

// Applies a live status and drops conversations that are now closed.
export const withEventStatus = <T extends Pick<Conversation, "id" | "status">>(
  conversations: T[],
  conversationId: string,
  status: T["status"],
) =>
  conversations
    .map((conversation) =>
      conversation.id === conversationId
        ? { ...conversation, status }
        : conversation,
    )
    .filter(
      (conversation) =>
        !["RESOLVED", "ABANDONED"].includes(conversation.status),
    );

export const takeNextNotice = (skill: string, taken: boolean) =>
  taken
    ? "Contact pris en charge · " + (skillLabel[skill] || skill)
    : "Aucun contact en attente dans la file " +
      (skillLabel[skill] || skill) +
      ".";
