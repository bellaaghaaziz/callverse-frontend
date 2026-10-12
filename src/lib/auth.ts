import { disconnectStomp } from "./stomp";
export function clearSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("jwt");
  sessionStorage.removeItem("expiresAt");
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
