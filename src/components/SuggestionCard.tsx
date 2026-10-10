"use client";
import {
  actionLabel,
  confidenceLabel,
  latencyLabel,
  type SuggestionViewModel,
} from "@/lib/ai";
import { intentLabel } from "@/lib/presentation";
// The ready content of the suggestion slot. The advisor stays in control:
// « Utiliser la suggestion » only fills the draft, and the proposed action
// is shown, never executed.
export default function SuggestionCard({
  suggestion,
  onUse,
  used,
  disabled,
}: {
  suggestion: SuggestionViewModel;
  onUse: () => void;
  // Already put in the draft; available again when the customer writes.
  used: boolean;
  // A message is being sent: inserting now would be erased.
  disabled: boolean;
}) {
  const action = actionLabel(suggestion.suggestedAction.type);
  const facts = [
    "Confiance " + confidenceLabel(suggestion.confidence),
    suggestion.intent ? intentLabel[suggestion.intent] || suggestion.intent : null,
    action ? "Action proposée : " + action + " (non exécutée)" : null,
    suggestion.sources.length + " source" + (suggestion.sources.length > 1 ? "s" : ""),
    suggestion.toolCalls.length + " outil" + (suggestion.toolCalls.length > 1 ? "s" : ""),
    latencyLabel(suggestion.latencyMs),
  ].filter(Boolean);
  return (
    <div>
      <div className="flex items-center gap-3">
        {/* One-line preview; the full reply below is the one read aloud. */}
        <p className="truncate grow min-w-0" aria-hidden="true">
          {suggestion.reply}
        </p>
        <button
          type="button"
          className="cv-button cv-button-small shrink-0"
          disabled={used || disabled}
          onClick={onUse}
        >
          {used ? "Suggestion utilisée" : "Utiliser la suggestion"}
        </button>
      </div>
      <p className="cv-muted">{facts.join(" · ")}</p>
      {/* Below the fold of the fixed-height slot: scroll to read it. */}
      <p className="mt-2 whitespace-pre-wrap">{suggestion.reply}</p>
      {suggestion.sources.length > 0 && (
        <ul className="mt-2" aria-label="Sources">
          {suggestion.sources.map((source) => (
            <li key={source.articleId}>
              {source.title || "Article " + source.articleId.slice(0, 8)}
              {source.score !== null &&
                " · " + Math.round(source.score * 100) + " %"}
            </li>
          ))}
        </ul>
      )}
      {suggestion.toolCalls.length > 0 && (
        <ul className="mt-2" aria-label="Outils utilisés">
          {suggestion.toolCalls.map((call, index) => (
            <li key={index}>
              {call.tool}
              {call.ok ? "" : " (échec)"}
              {call.summary && " · " + call.summary}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
