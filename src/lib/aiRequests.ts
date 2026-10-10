// Requests to the Spring AI façade. The browser never calls the AI service.
import { apiFetch } from "./api";
import {
  AI_FEATURES,
  adaptSuggestion,
  type AiFeature,
  type SuggestionViewModel,
} from "./ai";
// Provisional: agree with B8 (the Spring façade) before going live.
export const AI_ENDPOINTS = {
  suggestion: (conversationId: string) =>
    `/conversations/${encodeURIComponent(conversationId)}/suggestion`,
};
// Resolves to null, without any request, while the feature has no façade.
// Rejects with INVALID_SUGGESTION when the answer lacks a reply.
export async function requestSuggestion(
  conversationId: string,
  {
    signal,
    features = AI_FEATURES,
  }: { signal?: AbortSignal; features?: Record<AiFeature, boolean> },
): Promise<SuggestionViewModel | null> {
  if (!features.suggestion) return null;
  const answer = await apiFetch<unknown>(
    AI_ENDPOINTS.suggestion(conversationId),
    { method: "POST", signal },
  );
  const suggestion = adaptSuggestion(answer);
  if (!suggestion) throw new Error("INVALID_SUGGESTION");
  return suggestion;
}
