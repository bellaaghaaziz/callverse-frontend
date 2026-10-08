import { navigateTo } from "@/lib/navigation";
import { clearSession } from "@/lib/session";
import { disconnectStomp } from "@/lib/stomp";

function endSession(destination: string): void {
  disconnectStomp();
  clearSession();
  navigateTo(destination);
}

/** User-initiated sign-out. */
export function logout(): void {
  endSession("/login");
}

/** The server no longer accepts the token (expired, revoked, blocked user). */
export function expireSession(): void {
  endSession("/login?expired=1");
}
