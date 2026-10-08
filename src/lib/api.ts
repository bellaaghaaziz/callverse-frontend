import { expireSession } from "@/lib/auth";
import { getToken, isSessionExpired } from "@/lib/session";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

/**
 * A failed call. `message` equals `code`, so callers can branch on either.
 * status 0 means the server could not be reached.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly path?: string,
  ) {
    super(code);
    this.name = "ApiError";
  }
}

export interface ApiOptions extends RequestInit {
  /** Send no token and never treat a 401 as an expired session (login). */
  anonymous?: boolean;
}

export async function apiFetch(path: string, options: ApiOptions = {}) {
  const { anonymous = false, headers, ...init } = options;

  const token = anonymous ? null : getToken();
  if (token && isSessionExpired()) {
    expireSession();
    throw new ApiError(401, "SESSION_EXPIRED", path);
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", path);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const error = new ApiError(res.status, body?.code ?? `HTTP_${res.status}`, body?.path ?? path);
    // 401 = the token is no longer valid: re-login. 403 = not allowed: never re-login.
    if (res.status === 401 && token) expireSession();
    throw error;
  }

  // 204 No Content (e.g. takeNextConversation with an empty queue) has no body.
  if (res.status === 204) return null;
  return res.json();
}
