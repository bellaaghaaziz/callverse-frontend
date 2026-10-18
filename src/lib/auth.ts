import { disconnectStomp, refreshStompToken } from "./stomp";
export interface SessionTokens { token: string; expiresAt: string; role?: string; refreshToken?: string; refreshExpiresAt?: string }
export function storeSession(tokens: SessionTokens) {
  const previous = sessionStorage.getItem("jwt");
  sessionStorage.setItem("jwt", tokens.token);
  sessionStorage.setItem("expiresAt", tokens.expiresAt);
  if (tokens.refreshToken) sessionStorage.setItem("refreshToken", tokens.refreshToken);
  if (tokens.refreshExpiresAt) sessionStorage.setItem("refreshExpiresAt", tokens.refreshExpiresAt);
  if (previous && previous !== tokens.token) refreshStompToken();
  window.dispatchEvent(new Event("callverse:session-refreshed"));
}
export function clearSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("jwt");
  sessionStorage.removeItem("expiresAt");
  sessionStorage.removeItem("refreshToken");
  sessionStorage.removeItem("refreshExpiresAt");
  sessionStorage.removeItem("user");
  document.cookie = "role=; path=/; max-age=0; SameSite=Lax";
  document.cookie = "jwt=; path=/; max-age=0; SameSite=Lax";
  localStorage.removeItem("jwt");
  localStorage.removeItem("role");
  disconnectStomp();
}
export function sessionNotice(search: string): string | null {
  return new URLSearchParams(search).get("expired") === "1"
    ? "Votre session a expiré. Reconnectez-vous."
    : null;
}
export function expireSession() {
  clearSession();
  if (typeof window !== "undefined")
    window.location.replace("/login?expired=1");
}
