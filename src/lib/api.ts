import type { Schema } from "./contracts";
import { expireSession } from "./auth";
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
      INVALID_CREDENTIALS: "Email ou mot de passe incorrect.",
      UNAUTHENTICATED: "Votre session a expiré. Reconnectez-vous.",
      ACCESS_DENIED: "Vous n'êtes pas autorisé à effectuer cette action.",
      RESOURCE_NOT_FOUND: "Élément introuvable.",
      ADVISOR_PROFILE_NOT_FOUND:
        "Ce compte n'a pas de profil conseiller. Contactez votre administrateur.",
      ADVISOR_UNAVAILABLE: "Votre nombre maximum de conversations est atteint.",
      INVALID_STATE_TRANSITION:
        "Cette action n'est plus disponible. Actualisez les données.",
      EMAIL_ALREADY_USED: "Cette adresse email est déjà utilisée.",
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
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token =
    typeof window !== "undefined" ? sessionStorage.getItem("jwt") : null;
  const headers = new Headers(options.headers);
  if (options.body !== undefined)
    headers.set("Content-Type", "application/json");
  if (token && path !== "/auth/login")
    headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "omit",
    cache: "no-store",
  });
  if (!res.ok) {
    const body: Partial<Schema["ErrorResponse"]> | null = await res
      .json()
      .catch(() => null);
    if (res.status === 401 && path !== "/auth/login") expireSession();
    throw new ApiError(
      res.status,
      body?.code || `HTTP_${res.status}`,
      body?.message,
    );
  }
  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}
export const api = {
  login: (email: string, password: string) =>
    apiFetch<Schema["TokenResponse"]>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => apiFetch<Schema["CurrentUserResponse"]>("/auth/me"),
};
