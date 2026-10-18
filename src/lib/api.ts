import type { Schema } from "./contracts";
import { clearSession, expireSession, storeSession, type SessionTokens } from "./auth";
const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1"
).replace(/\/$/, "");
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public detail?: string,
  ) {
    super(code);
    this.name = "ApiError";
  }
}
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const messages: Record<string, string> = {
      INVALID_CREDENTIALS: "Adresse e-mail ou mot de passe incorrect.",
      UNAUTHENTICATED: "Votre session a expiré. Reconnectez-vous.",
      ACCESS_DENIED: "Vous n'êtes pas autorisé à effectuer cette action.",
      RESOURCE_NOT_FOUND: "Élément introuvable.",
      ADVISOR_PROFILE_NOT_FOUND:
        "Ce compte n'a pas de profil conseiller. Contactez votre administrateur.",
      ADVISOR_UNAVAILABLE: "Votre nombre maximum de conversations est atteint.",
      INVALID_STATE_TRANSITION:
        "Cette action n'est plus disponible. Actualisez les données.",
      EMAIL_ALREADY_USED: "Cette adresse e-mail est déjà utilisée.",
      SELF_LOCKOUT:
        "Vous ne pouvez pas bloquer votre compte ou modifier votre propre rôle.",
      VALIDATION_FAILED: "Vérifiez les champs saisis.",
      MALFORMED_REQUEST: "La demande est invalide.",
      CONVERSATION_CUSTOMER_MISMATCH:
        "La conversation n'appartient pas à ce client.",
      SLA_POLICY_NOT_FOUND:
        "Aucune politique SLA configurée. Contactez l'équipe backend.",
      PASSWORD_TOO_WEAK: "Le mot de passe ne respecte pas les exigences.",
      INTERNAL_ERROR: "Le service rencontre une erreur. Réessayez plus tard.",
      WORKFORCE_UNAVAILABLE: "L’analyse des effectifs est indisponible. Réessayez dans quelques instants.",
      SIMULATION_RUN_ALREADY_EXISTS: "Cette combinaison scénario, stratégie et graine existe déjà. Choisissez une autre graine.",
    };
    return (
      messages[error.code] ||
      (error.status >= 500
        ? messages.INTERNAL_ERROR
        : error.detail || error.code)
    );
  }
  return "Connexion au service impossible. Vérifiez la disponibilité du backend.";
}
let refreshing: { credential: string; promise: Promise<boolean> } | null = null;
let rotation: { previous: string; current: string } | null = null;
export async function refreshSession(expectedToken = sessionStorage.getItem("jwt")): Promise<boolean> {
  if (!expectedToken || sessionStorage.getItem("jwt") !== expectedToken) return false;
  const credential = sessionStorage.getItem("refreshToken");
  if (!credential) return false;
  if (refreshing?.credential === credential) return refreshing.promise;
  const promise = (async () => {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: credential }), credentials: "omit", cache: "no-store",
    });
    if (sessionStorage.getItem("jwt") !== expectedToken || sessionStorage.getItem("refreshToken") !== credential) return false;
    if (!response.ok) {
      if (response.status === 401) expireSession();
      throw new ApiError(response.status, response.status === 401 ? "UNAUTHENTICATED" : "INTERNAL_ERROR");
    }
    const tokens = await response.json() as SessionTokens;
    if (sessionStorage.getItem("jwt") !== expectedToken || sessionStorage.getItem("refreshToken") !== credential) return false;
    rotation = { previous: expectedToken, current: tokens.token };
    storeSession(tokens);
    return true;
  })();
  refreshing = { credential, promise };
  try { return await promise; }
  finally { if (refreshing?.promise === promise) refreshing = null; }
}
export async function logoutSession() {
  const credential = sessionStorage.getItem("refreshToken");
  clearSession();
  if (credential) await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: credential }), credentials: "omit", cache: "no-store", keepalive: true,
  });
}
export async function apiResponse(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const token =
    typeof window !== "undefined" ? sessionStorage.getItem("jwt") : null;
  let authenticatedToken = token;
  const headers = new Headers(options.headers);
  if (options.body !== undefined)
    headers.set("Content-Type", "application/json");
  const publicAuth = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"].includes(path);
  if (token && !publicAuth)
    headers.set("Authorization", `Bearer ${token}`);
  let res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "omit",
    cache: "no-store",
  });
  if (res.status === 401 && token && !publicAuth) {
    const current = sessionStorage.getItem("jwt");
    const rotated = rotation?.previous === token && rotation.current === current;
    if (rotated || (current === token && await refreshSession(token))) {
      authenticatedToken = sessionStorage.getItem("jwt");
      headers.set("Authorization", `Bearer ${authenticatedToken}`);
      res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, credentials: "omit", cache: "no-store" });
    }
  }
  if (!res.ok) {
    const body: Partial<Schema["ErrorResponse"]> | null = await res
      .json()
      .catch(() => null);
    // A late response must not expire a session that was closed or replaced.
    if (
      res.status === 401 &&
      !publicAuth &&
      token &&
      sessionStorage.getItem("jwt") === authenticatedToken
    ) expireSession();
    throw new ApiError(
      res.status,
      body?.code || `HTTP_${res.status}`,
      body?.message,
    );
  }
  return res;
}
export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await apiResponse(path, options);
  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}
export const api = {
  login: (email: string, password: string) =>
    apiFetch<SessionTokens>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => apiFetch<Schema["CurrentUserResponse"]>("/auth/me"),
};
