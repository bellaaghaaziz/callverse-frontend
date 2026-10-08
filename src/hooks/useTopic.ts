"use client";
import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  subscribeTopic,
  watchConnection,
  connectionSnapshot,
  serverConnectionSnapshot,
} from "@/lib/stomp";
export function useTopic<T>(topic: string | null, receive: (event: T) => void) {
  const callback = useRef(receive);
  useEffect(() => {
    callback.current = receive;
  }, [receive]);
  useEffect(() => {
    if (!topic) return;
    return subscribeTopic(topic, (event) => callback.current(event as T));
  }, [topic]);
}
export function useConnection() {
  return useSyncExternalStore(
    watchConnection,
    connectionSnapshot,
    serverConnectionSnapshot,
  );
}
