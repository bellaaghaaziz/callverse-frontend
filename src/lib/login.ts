// Login health line: the backend status as shown under the demo accounts.
// `state` names it for styling (the dot); a failed request wins over a stale status.
export function serviceStatus(status: string | null, unavailable: boolean) {
  if (unavailable) return { state: "down", text: "Service indisponible" };
  if (!status) return { state: "checking", text: "Vérification du service…" };
  if (status === "UP") return { state: "up", text: "Service disponible" };
  if (status === "DEGRADED")
    return {
      state: "degraded",
      text: "Service disponible · fonctions IA indisponibles",
    };
  return { state: "down", text: "Service indisponible" };
}
