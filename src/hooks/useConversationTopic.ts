"use client";
import { useState } from "react";
import { useTopic } from "./useTopic";
import type { ConversationEvent } from "@/lib/contracts";
export type { ConversationEvent } from "@/lib/contracts";
export function useConversationTopic(id: string | null) {
  const [event, setEvent] = useState<ConversationEvent | null>(null);
  useTopic<ConversationEvent>(
    id ? `/topic/conversation/${id}` : null,
    setEvent,
  );
  return event?.conversationId === id ? event : null;
}
