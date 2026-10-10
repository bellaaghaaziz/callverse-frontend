"use client";
import { useEffect, useState } from "react";
import { useAiCapability } from "@/hooks/useAiCapability";
import {
  aiSlotState,
  suggestionKey,
  type AiRequest,
  type SuggestionViewModel,
} from "@/lib/ai";
import { requestSuggestion } from "@/lib/aiRequests";
import type { Message } from "@/lib/contracts";
type Result = {
  key: string;
  request: AiRequest;
  suggestion: SuggestionViewModel | null;
};
// Asks the façade for a reply suggestion when the customer writes something
// new. A newer key aborts the older request, and a result is only shown for
// the key it answers, so a suggestion never appears in the wrong conversation.
export function useSuggestion(
  conversationId: string | null,
  messages: Message[],
) {
  const capability = useAiCapability("suggestion");
  const key = suggestionKey(conversationId, messages);
  const [result, setResult] = useState<Result | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (capability !== "available" || !key || !conversationId) return;
    const controller = new AbortController();
    setResult({ key, request: "pending", suggestion: null });
    requestSuggestion(conversationId, { signal: controller.signal })
      .then((suggestion) => {
        if (controller.signal.aborted) return;
        setResult({
          key,
          request: suggestion ? "done" : "failed",
          suggestion,
        });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setResult({ key, request: "failed", suggestion: null });
      });
    return () => controller.abort();
  }, [capability, key, conversationId, attempt]);
  const current = result?.key === key ? result : null;
  const request: AiRequest = !key ? "idle" : (current?.request ?? "pending");
  return {
    state: aiSlotState(capability, request),
    suggestion: current?.request === "done" ? current.suggestion : null,
    retry: () => setAttempt((value) => value + 1),
  };
}
