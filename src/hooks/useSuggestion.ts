"use client";
import { useEffect, useRef, useState } from "react";
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
// Wait for a burst of customer messages to settle before asking: every
// request is a model run on the server, even if the browser aborts it.
const SETTLE_MS = 600;
// Asks the façade for a reply suggestion when the customer writes something
// new. Answers are kept per key, so switching back to a conversation does
// not ask again, and a result is shown only for the key it answers, so a
// suggestion never appears in the wrong conversation.
export function useSuggestion(
  conversationId: string | null,
  messages: Message[],
) {
  const capability = useAiCapability("suggestion");
  const key = suggestionKey(conversationId, messages);
  const answers = useRef(new Map<string, SuggestionViewModel>());
  const [result, setResult] = useState<Result | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [usedKey, setUsedKey] = useState<string | null>(null);
  useEffect(() => {
    if (capability !== "available" || !key || !conversationId) return;
    const cached = answers.current.get(key);
    if (cached) {
      setResult({ key, request: "done", suggestion: cached });
      return;
    }
    const controller = new AbortController();
    setResult({ key, request: "pending", suggestion: null });
    const timer = setTimeout(() => {
      requestSuggestion(conversationId, { signal: controller.signal })
        .then((suggestion) => {
          if (controller.signal.aborted) return;
          if (suggestion) answers.current.set(key, suggestion);
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
    }, SETTLE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [capability, key, conversationId, attempt]);
  const current = result?.key === key ? result : null;
  const request: AiRequest = !key ? "idle" : (current?.request ?? "pending");
  return {
    state: aiSlotState(capability, request),
    suggestion: current?.request === "done" ? current.suggestion : null,
    // Used once until the customer writes again, so it is never re-inserted
    // after the advisor has sent it.
    used: !!key && usedKey === key,
    markUsed: () => setUsedKey(key),
    retry: () => setAttempt((value) => value + 1),
  };
}
