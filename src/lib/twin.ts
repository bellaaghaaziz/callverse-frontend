import { apiFetch } from "./api";

export const twinStrategies = [
  { code: "STATIC_FIFO", name: "Statique", detail: "Aucune réaffectation" },
  { code: "THRESHOLD", name: "Seuil", detail: "Renfort au-delà de 3 clients en file" },
  { code: "RL_PPO_V1", name: "IA — PPO", detail: "Apprentissage par renforcement" },
] as const;
export type TwinStrategy = typeof twinStrategies[number]["code"];
export interface TwinScenario { id: string; name: string; loadProfile: "LOW" | "MEDIUM" | "SATURATED"; durationMinutes: number; advisorCount: number }
export interface TwinKpis { totalConversations: number; slaRatio: number; abandonRatio: number; avgWaitSeconds: number; p95WaitSeconds: number }
export interface TwinRun { runId: string; scenarioId: string; strategyCode: TwinStrategy; seed: number; status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED"; errorMessage: string | null; startedAt: string | null; endedAt: string | null; kpis: TwinKpis | null }
export interface TwinSummary { strategy: TwinStrategy; seeds: number[]; kpis: TwinKpis }
export const twinApi = {
  scenarios: (signal?: AbortSignal) => apiFetch<TwinScenario[]>("/scenarios", { signal }),
  compare: (scenarioId: string, signal?: AbortSignal) => apiFetch<TwinRun[]>("/twin-runs?" + new URLSearchParams({ scenarioId }), { signal }),
  run: (scenarioId: string, strategyCode: TwinStrategy, seed: number, signal?: AbortSignal) =>
    apiFetch<TwinRun>("/twin-runs", { method: "POST", signal, body: JSON.stringify({ scenarioId, strategyCode, seed }) }),
};

export function summarizeTwinRuns(runs: TwinRun[]): TwinSummary[] {
  return twinStrategies.flatMap(({ code }) => {
    const unique = new Map<number, TwinRun>();
    for (const run of runs) if (run.strategyCode === code && run.status === "COMPLETED" && run.kpis) unique.set(run.seed, run);
    const records = [...unique.values()];
    if (!records.length) return [];
    const mean = (key: keyof TwinKpis) => records.reduce((sum, run) => sum + run.kpis![key], 0) / records.length;
    return [{ strategy: code, seeds: [...unique.keys()].sort((a, b) => a - b), kpis: {
      totalConversations: mean("totalConversations"), slaRatio: mean("slaRatio"), abandonRatio: mean("abandonRatio"),
      avgWaitSeconds: mean("avgWaitSeconds"), p95WaitSeconds: mean("p95WaitSeconds"),
    } }];
  });
}
export const twinPercent = (value: number) => value.toLocaleString("fr-FR", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });
export function twinWait(value: number) { const seconds = Math.round(value); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
