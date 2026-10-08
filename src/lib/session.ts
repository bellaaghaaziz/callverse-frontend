/**
 * Browser session: the JWT and its expiry live in sessionStorage (they die
 * with the tab and are never sent as cookies). The role is mirrored in a
 * cookie only so the middleware can route pages; the backend re-checks the
 * role on every request, so the cookie is a navigation hint, not a guard.
 */

const TOKEN_KEY = "jwt";
const EXPIRES_KEY = "jwt_expires_at";
const ROLE_COOKIE = "role";

export interface Session {
  token: string;
  role: string;
  /** ISO-8601 instant from the login response. */
  expiresAt: string;
}

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function writeRoleCookie(value: string, maxAgeSeconds: number): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${ROLE_COOKIE}=${encodeURIComponent(value)}; path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

export function saveSession({ token, role, expiresAt }: Session): void {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(EXPIRES_KEY, expiresAt);
  const secondsLeft = Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000));
  writeRoleCookie(role, secondsLeft);
}

export function getToken(): string | null {
  return hasWindow() ? sessionStorage.getItem(TOKEN_KEY) : null;
}

export function isSessionExpired(): boolean {
  if (!hasWindow()) return false;
  const expiresAt = sessionStorage.getItem(EXPIRES_KEY);
  return expiresAt !== null && Date.parse(expiresAt) <= Date.now();
}

export function clearSession(): void {
  if (!hasWindow()) return;
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(EXPIRES_KEY);
  writeRoleCookie("", 0);
  // Keys written by earlier versions of the app.
  localStorage.removeItem("jwt");
  localStorage.removeItem("role");
  document.cookie = "jwt=; path=/; Max-Age=0; SameSite=Lax";
}
