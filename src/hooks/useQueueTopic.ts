"use client";
import { useEffect, useRef } from "react";
import { subscribeTopic } from "@/lib/stomp";
import type { QueueEvent } from "@/lib/contracts";
export function useQueueTopics(
  skills: string[],
  receive: (event: QueueEvent) => void,
) {
  const callback = useRef(receive);
  useEffect(() => {
    callback.current = receive;
  }, [receive]);
  const key = [...new Set(skills)].sort().join(",");
  useEffect(() => {
    if (!key) return;
    const unsubscribe = key
      .split(",")
      .map((skill) =>
        subscribeTopic(`/topic/queue/${skill}`, (event) =>
          callback.current(event as QueueEvent),
        ),
      );
    return () => unsubscribe.forEach((stop) => stop());
  }, [key]);
}
