"use client";
import { useId } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { useAiCapability } from "@/hooks/useAiCapability";
import {
  aiSlotState,
  type AiFeature,
  type AiRequest,
  type AiSlotState,
} from "@/lib/ai";
type SlotProps = {
  title: string;
  onRetry?: () => void;
  // The rendered result, shown only in the ready state.
  children?: React.ReactNode;
};
// One place an AI feature renders. Its state comes from the feature's
// capability and the caller's request.
export default function AiSlot({
  feature,
  request = "pending",
  ...props
}: SlotProps & { feature: AiFeature; request?: AiRequest }) {
  return (
    <AiSlotView
      state={aiSlotState(useAiCapability(feature), request)}
      {...props}
    />
  );
}
// The markup for one state. Its height is fixed in every state, so the AI's
// arrival or failure never moves the page.
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
      <div role="status">
        {state === "unavailable-soon" && <p>Bientôt disponible</p>}
        {state === "unavailable-down" && (
          <p>
            Service IA indisponible. Vous pouvez continuer sans suggestion.
          </p>
        )}
        {state === "loading" && <p>Préparation en cours…</p>}
        {state === "error" && (
          <p className="flex items-center gap-3">
            Le service IA n’a pas pu répondre.
            <button
              type="button"
              className="cv-button cv-button-secondary cv-button-small"
              disabled={!onRetry}
              onClick={onRetry}
            >
              <RefreshCw size={12} />
              Réessayer
            </button>
          </p>
        )}
        {state === "ready" && children}
      </div>
    </section>
  );
}
