"use client";
import { useId } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import type { AiSlotState } from "@/lib/ai";
type SlotProps = {
  title: string;
  onRetry?: () => void;
  // The rendered result, shown only in the ready state.
  children?: React.ReactNode;
};
const messages: Record<AiSlotState, string> = {
  idle: "En attente d’un message du client",
  "unavailable-soon": "Bientôt disponible",
  "unavailable-down": "Service IA indisponible",
  loading: "Préparation en cours…",
  error: "Le service IA n’a pas pu répondre.",
  ready: "",
};
// Where an AI feature renders. Each feature's hook (e.g. useSuggestion)
// derives the state from its capability and request. The height is fixed in
// every state, so the AI's arrival or failure never moves the page.
export function AiSlotView({
  state,
  title,
  onRetry,
  children,
}: SlotProps & { state: AiSlotState }) {
  const titleId = useId();
  return (
    <section
      className="cv-notice cv-ai-slot"
      aria-labelledby={titleId}
      aria-busy={state === "loading"}
      data-state={state}
      // A result can be longer than the fixed height: let keyboards scroll it.
      tabIndex={state === "ready" ? 0 : undefined}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <strong id={titleId} className="flex items-center gap-2">
          <Sparkles size={13} aria-hidden="true" />
          {title}
        </strong>
        {state === "ready" && (
          <span className="cv-badge cv-badge-green">Généré par l’IA</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {/* Short state text only, so screen readers never read a whole reply. */}
        <p role="status">
          {messages[state] ||
            (state === "ready" && (
              <span className="sr-only">Résultat disponible</span>
            ))}
        </p>
        {state === "error" && (
          <button
            type="button"
            className="cv-button cv-button-secondary cv-button-small"
            disabled={!onRetry}
            onClick={onRetry}
          >
            <RefreshCw size={12} />
            Réessayer
          </button>
        )}
      </div>
      {state === "ready" && children}
    </section>
  );
}
