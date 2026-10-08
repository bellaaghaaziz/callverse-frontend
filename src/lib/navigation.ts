/**
 * Full-page navigation. Used when a session ends, so every in-memory state
 * (React state, the STOMP singleton) is discarded with the page.
 */
export function navigateTo(url: string): void {
  window.location.assign(url);
}
