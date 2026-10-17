import { apiFetch } from "./api";

export type RunStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
export interface SimulationRun {
  runId: string; conversationId: string | null; status: RunStatus;
  conversationStatus: string | null; messageCount: number;
  errorMessage: string | null; startedAt: string | null; endedAt: string | null;
}
export interface SimulationOptions {
  scenarios: { id: string; name: string; loadProfile: string }[];
  strategies: { code: string; name: string }[];
}
export interface SimulationSetup {
  scenarioId: string; strategyCode: string; seed: number;
  profile: string; objective: string; patience: number; satisfaction: number;
  maxTurns: number; customerSegment: string; tenureMonths: number;
}
export interface SimulationMessage { id: number; sender: string; content: string; sentAt: string }
export interface QualityEvaluation {
  id: string; globalScore: number; scores: Record<string, number>;
  explanation: string | null; evaluator: string; createdAt: string;
}
export interface WorkforceRecommendation {
  decisionId: number; generatedAt: string; type: string;
  fromPool: string | null; toPool: string | null; count: number | null;
  reason: string; expectedGain: Record<string, number>; requiresApproval: boolean;
  observation: {
    queues: Record<string, number>; averageWaitSeconds: Record<string, number>;
    available: Record<string, number>; slaToday: number; slaMeasured: boolean;
    hour: number; trend: number;
  };
  caveats: string[];
}

export const running = (run: SimulationRun) => ["PENDING", "RUNNING"].includes(run.status);
export const aiWorkspace = {
  createScenario: (name: string) => apiFetch<SimulationOptions["scenarios"][number]>("/simulation-runs/scenarios", {
    method: "POST", body: JSON.stringify({ name: name.trim() }),
  }),
  options: (signal?: AbortSignal) => apiFetch<SimulationOptions>("/simulation-runs/options", { signal }),
  runs: (signal?: AbortSignal) => apiFetch<SimulationRun[]>("/simulation-runs", { signal }),
  start: (setup: SimulationSetup) => apiFetch<SimulationRun>("/simulation-runs", {
    method: "POST", body: JSON.stringify(setup),
  }),
  run: (id: string, signal?: AbortSignal) => apiFetch<SimulationRun>(`/simulation-runs/${encodeURIComponent(id)}`, { signal }),
  transcript: (id: string, signal?: AbortSignal) => apiFetch<SimulationMessage[]>(`/simulation-runs/${encodeURIComponent(id)}/messages`, { signal }),
  workforce: () => apiFetch<WorkforceRecommendation>("/supervision/workforce/recommendations", { method: "POST" }),
  quality: (id: string, signal?: AbortSignal) => apiFetch<QualityEvaluation[]>(`/supervision/conversations/${encodeURIComponent(id)}/quality`, { signal }),
  requestQuality: (id: string) => apiFetch<void>(`/supervision/conversations/${encodeURIComponent(id)}/quality`, { method: "POST" }),
};

export const skillNames: Record<string, string> = {
  ACCOUNTS: "Comptes", CARDS: "Cartes bancaires", CREDIT: "Crédit", FRAUD: "Fraude",
};
export const runNames: Record<RunStatus, string> = {
  PENDING: "En attente", RUNNING: "En cours", COMPLETED: "Terminée", FAILED: "Interrompue",
};
export const criterionNames: Record<string, string> = {
  RELEVANCE: "Pertinence", ACCURACY: "Exactitude", COMPLIANCE: "Respect des procédures",
  COMMUNICATION: "Communication", EMPATHY: "Empathie", RESOLUTION: "Résolution",
};
