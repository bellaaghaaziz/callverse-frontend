"use client";
import { useEffect, useState } from "react";
import { getStompClient } from "@/lib/stomp";

/** Event published on /topic/queue/{skill} (backend integration guide, §8). */
export interface QueueEvent {
  schemaVersion: 1;
  type: "CONVERSATION_QUEUED" | "CONVERSATION_LEFT_QUEUE";
  occurredAt: string;
  skill: string;
  conversationId: string;
  /** On departure, why it left the queue: ASSIGNED or ABANDONED. */
  status: string;
  waiting: number;
}

export function useQueueTopic(skill: string | null) {
  const [lastEvent, setLastEvent] = useState<QueueEvent | null>(null);

  useEffect(() => {
    if (!skill) return;
    const client = getStompClient();
    let subId: string | undefined;

    const doSubscribe = () => {
      const sub = client.subscribe(`/topic/queue/${skill}`, (frame) => {
        setLastEvent(JSON.parse(frame.body));
      });
      subId = sub.id;
    };

    if (client.connected) doSubscribe();
    else client.onConnect = doSubscribe;

    return () => { if (subId) client.unsubscribe(subId); };
  }, [skill]);

  return lastEvent;
} 