// AI-ready seams. The browser never calls the AI service: every feature will
// reach it through the Spring façade once that exists.
export type AiFeature = "suggestion" | "workforce" | "quality" | "simulation";
// soon: no façade yet · checking: health not known yet · down: AI unusable ·
// available: the façade exists and the AI service is configured.
export type AiCapability = "soon" | "checking" | "down" | "available";
// idle: nothing to answer yet (e.g. no customer message).
export type AiRequest = "idle" | "pending" | "done" | "failed";
export type AiSlotState =
  | "idle"
  | "unavailable-soon"
  | "unavailable-down"
  | "loading"
  | "ready"
  | "error";
export function aiSlotState(
  capability: AiCapability,
  request: AiRequest = "pending",
): AiSlotState {
  if (capability === "soon") return "unavailable-soon";
  if (capability === "down") return "unavailable-down";
  if (capability === "checking") return "loading";
  if (request === "idle") return "idle";
  return request === "done"
    ? "ready"
    : request === "failed"
      ? "error"
      : "loading";
}
// "The Spring façade for this feature exists." Flip one flag per feature when
// its endpoint ships (roadmap R5W); later, read these from a capabilities endpoint.
export const AI_FEATURES: Record<AiFeature, boolean> = {
  suggestion: false,
  workforce: false,
  quality: false,
  simulation: false,
};
// UNREACHABLE: the health request itself failed.
export type AiHealth = "UP" | "DEGRADED" | "DOWN" | "UNREACHABLE";
// Health only downgrades: UP means an AI URL is configured, not that the AI
// answers, so it never makes a feature available on its own.
export function capabilityFor(
  feature: AiFeature,
  health: AiHealth | null,
  features: Record<AiFeature, boolean> = AI_FEATURES,
): AiCapability {
  if (!features[feature]) return "soon";
  if (health === null) return "checking";
  return health === "UP" ? "available" : "down";
}

// View models and adapters.
// Provisional: from ai-service @ 48afba8 (2026-10-02); confirm on 2026-10-11.
// Each adapter takes the façade's JSON and returns null when the required
// fields are missing, so a slot shows an error instead of a broken result.
type Json = Record<string, unknown>;
const isRecord = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown) =>
  typeof value === "string" && value.trim() ? value : null;
const numberIn = (value: unknown, min: number, max: number) =>
  typeof value === "number" && value >= min && value <= max ? value : null;
const list = (value: unknown) => (Array.isArray(value) ? value : []);
const INTENTS = ["BALANCE", "CARD", "CREDIT", "FRAUD", "ACCOUNT_CLOSURE", "OTHER"];
export const AI_ACTIONS = [
  "NONE",
  "CREATE_CASE",
  "APPLY_CREDIT",
  "ESCALATE",
  "TRANSFER",
  "BLOCK_CARD",
] as const;
export type AiActionType = (typeof AI_ACTIONS)[number];

export interface SuggestionViewModel {
  reply: string;
  intent: string | null;
  confidence: number | null;
  // title: only if the façade sends it (the KB has no get-by-id).
  sources: { articleId: string; title: string | null; score: number | null }[];
  toolCalls: { tool: string; ok: boolean; summary: string }[];
  suggestedAction: { type: AiActionType; payload: Json };
  latencyMs: number | null;
}
export function adaptSuggestion(raw: unknown): SuggestionViewModel | null {
  if (!isRecord(raw)) return null;
  const reply = text(raw.reply);
  if (!reply) return null;
  const intent = text(raw.intent);
  const action = isRecord(raw.action) ? raw.action : {};
  return {
    reply,
    intent: intent && INTENTS.includes(intent) ? intent : null,
    confidence: numberIn(raw.confidence, 0, 1),
    sources: list(raw.sources).flatMap((source) => {
      if (!isRecord(source)) return [];
      // A UUID in the contract; a façade may still serialise ids as numbers.
      const id = source.kb_article_id;
      const articleId =
        typeof id === "number" && Number.isFinite(id) ? String(id) : text(id);
      return articleId
        ? [{ articleId, title: text(source.title), score: numberIn(source.score, 0, 1) }]
        : [];
    }),
    toolCalls: list(raw.tool_calls).flatMap((call) =>
      isRecord(call) && text(call.tool)
        ? [{ tool: String(call.tool), ok: call.ok === true, summary: text(call.result_summary) ?? "" }]
        : [],
    ),
    suggestedAction: {
      type: AI_ACTIONS.find((type) => type === action.type) ?? "NONE",
      payload: isRecord(action.payload) ? action.payload : {},
    },
    latencyMs: numberIn(raw.latency_ms, 0, Number.MAX_SAFE_INTEGER),
  };
}

export interface WorkforceViewModel {
  action: string;
  fromPool: string | null;
  toPool: string | null;
  count: number | null;
  reason: string | null;
  // One number per metric, e.g. { wait_seconds: -45 }.
  expectedGain: Record<string, number>;
}
export function adaptWorkforce(raw: unknown): WorkforceViewModel | null {
  if (!isRecord(raw)) return null;
  const action = text(raw.type);
  if (!action) return null;
  const gain = isRecord(raw.expected_gain) ? raw.expected_gain : {};
  return {
    action,
    fromPool: text(raw.from_pool),
    toPool: text(raw.to_pool),
    count:
      Number.isInteger(raw.count) && (raw.count as number) >= 0
        ? (raw.count as number)
        : null,
    reason: text(raw.reason),
    expectedGain: Object.fromEntries(
      Object.entries(gain).filter(([, value]) => typeof value === "number"),
    ) as Record<string, number>,
  };
}

export interface QualityViewModel {
  conversationId: string | null;
  globalScore: number;
  criteria: { name: string; score: number }[];
  explanation: string | null;
  evidence: { criterion: string; score: number | null; text: string | null }[];
  flags: Json;
  recommendations: string[];
}
export function adaptQuality(raw: unknown): QualityViewModel | null {
  if (!isRecord(raw) || typeof raw.global_score !== "number") return null;
  const scores = isRecord(raw.scores) ? raw.scores : {};
  return {
    conversationId: text(raw.conversation_id),
    globalScore: raw.global_score,
    criteria: Object.entries(scores).flatMap(([name, score]) =>
      typeof score === "number" ? [{ name, score }] : [],
    ),
    explanation: text(raw.explanation),
    evidence: list(raw.evidence).flatMap((item) =>
      isRecord(item) && text(item.criterion)
        ? [{
            criterion: String(item.criterion),
            score: typeof item.score === "number" ? item.score : null,
            text: text(item.evidence),
          }]
        : [],
    ),
    flags: isRecord(raw.flags) ? raw.flags : {},
    recommendations: list(raw.recommendations).filter(
      (item): item is string => typeof item === "string",
    ),
  };
}

export interface SimulationTurnViewModel {
  content: string | null;
  status: "ONGOING" | "RESOLVED" | "ABANDONED" | null;
  state: {
    profile: string;
    // 0-100 in the contract
    patience: number | null;
    satisfaction: number | null;
    objective: string | null;
    objectiveMet: boolean;
  };
}
const SIMULATION_STATUS = {
  en_cours: "ONGOING",
  resolu: "RESOLVED",
  abandonne: "ABANDONED",
} as const;
export function adaptSimulationTurn(raw: unknown): SimulationTurnViewModel | null {
  if (!isRecord(raw) || !isRecord(raw.state)) return null;
  const profile = text(raw.state.profile);
  if (!profile) return null;
  const status = raw.status;
  return {
    content: text(raw.content),
    status:
      typeof status === "string" &&
      Object.prototype.hasOwnProperty.call(SIMULATION_STATUS, status)
        ? SIMULATION_STATUS[status as keyof typeof SIMULATION_STATUS]
        : null,
    state: {
      profile,
      patience: numberIn(raw.state.patience, 0, 100),
      satisfaction: numberIn(raw.state.satisfaction, 0, 100),
      objective: text(raw.state.objective),
      objectiveMet: raw.state.objective_met === true,
    },
  };
}

// Suggestion presentation and use.
export const confidenceLabel = (confidence: number | null) =>
  confidence === null ? "—" : Math.round(confidence * 100) + " %";
export const latencyLabel = (ms: number | null) =>
  ms === null
    ? "—"
    : Math.round(ms) < 1000
      ? Math.round(ms) + " ms"
      : new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(
          ms / 1000,
        ) + " s";
const ACTION_LABELS: Record<AiActionType, string | null> = {
  NONE: null,
  CREATE_CASE: "Ouvrir un dossier",
  APPLY_CREDIT: "Geste commercial",
  ESCALATE: "Escalader",
  TRANSFER: "Transférer",
  BLOCK_CARD: "Bloquer la carte",
};
export const actionLabel = (type: AiActionType) => ACTION_LABELS[type];
// Never overwrite what the advisor typed: append once, within the message
// limit, without splitting a character in two.
export function draftWithSuggestion(
  draft: string,
  reply: string,
  limit: number,
): string {
  const typed = draft.trim();
  if (typed.includes(reply.trim())) return draft;
  const merged = (typed ? typed + " " + reply : reply).slice(0, limit);
  const last = merged.charCodeAt(merged.length - 1);
  // A lone high surrogate means the cut fell inside an emoji.
  return last >= 0xd800 && last <= 0xdbff ? merged.slice(0, -1) : merged;
}
// Changes only when the customer writes something new in this conversation,
// so the advisor's own messages never trigger another suggestion.
export function suggestionKey(
  conversationId: string | null,
  messages: { id: number; sender: string; conversationId: string }[],
): string | null {
  if (!conversationId) return null;
  const last = messages
    .filter((m) => m.conversationId === conversationId && m.sender === "CUSTOMER")
    .at(-1);
  return last ? conversationId + ":" + last.id : null;
}
