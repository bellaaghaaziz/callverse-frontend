"use client";
import { useEffect, useRef, useState } from "react";
import { adaptSuggestion, suggestionKey, type SuggestionViewModel } from "@/lib/ai";
import type { AdvisorWorkspace } from "@/hooks/useAdvisorWorkspace";
import { AiSlotView } from "@/components/AiSlot";
import SuggestionCard from "@/components/SuggestionCard";

export default function AssistantPanel({ workspace }: { workspace: AdvisorWorkspace }) {
  const conversationId = workspace.canReply ? workspace.activeConvId : null;
  const key = suggestionKey(conversationId, workspace.messages);
  const cache = useRef(new Map<string, SuggestionViewModel>());
  const [result, setResult] = useState<{ key: string; suggestion: SuggestionViewModel | null; error: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [usedKey, setUsedKey] = useState<string | null>(null);
  useEffect(() => {
    if (!key || !conversationId) return;
    const cached = cache.current.get(key);
    if (cached) { setResult({ key, suggestion: cached, error: "" }); return; }
    const controller = new AbortController();
    setResult(null);
    // The existing authenticated drafting route runs without sending a chat message.
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/ai-preview", { method: "POST", signal: controller.signal,
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + sessionStorage.getItem("jwt") },
          body: JSON.stringify({ feature: "suggestion", conversationId }) });
        const body = await response.json();
        if (!response.ok) throw new Error(body.message?.includes("désactivé") ? "L’assistant IA n’est pas activé pour le moment." : body.message || "L’assistant est indisponible pour le moment.");
        const suggestion = adaptSuggestion(body);
        if (!suggestion) throw new Error("La suggestion n’a pas pu être préparée.");
        if (controller.signal.aborted) return;
        cache.current.set(key, suggestion);
        setResult({ key, suggestion, error: "" });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ key, suggestion: null, error: error instanceof Error ? error.message : "L’assistant est indisponible." });
      }
    }, 600);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [key, conversationId, attempt]);
  const current = result?.key === key ? result : null;
  const suggestion = current?.suggestion;
  return <section className="cv-assistant-panel">
    <p className="cv-subtitle">Une aide préparée en parallèle de votre échange. Vous choisissez la réponse à envoyer.</p>
    <AiSlotView title="Suggestion de réponse" state={!key ? "idle" : current?.error ? "error" : suggestion ? "ready" : "loading"} onRetry={() => setAttempt(value => value + 1)}>
      {suggestion && <SuggestionCard suggestion={suggestion} used={usedKey === key} disabled={workspace.busy || !workspace.canReply}
        onUse={() => { workspace.setDraft(suggestion.reply); setUsedKey(key); }} />}
    </AiSlotView>
    {current?.error && <p className="cv-muted cv-section" role="status">{current.error}</p>}
  </section>;
}
