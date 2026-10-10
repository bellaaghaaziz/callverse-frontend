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
