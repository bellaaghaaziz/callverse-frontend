// AI-ready seams. The browser never calls the AI service: every feature will
// reach it through the Spring façade once that exists.
export type AiFeature = "suggestion" | "workforce" | "quality" | "simulation";
// soon: no façade yet · checking: health not known yet · down: AI unusable ·
// available: the façade exists and the AI service is configured.
export type AiCapability = "soon" | "checking" | "down" | "available";
export type AiRequest = "pending" | "done" | "failed";
export type AiSlotState =
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
