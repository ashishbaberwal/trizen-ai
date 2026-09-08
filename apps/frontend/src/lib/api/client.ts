/**
 * Typed API client for the Express backend.
 *
 * The base URL comes from NEXT_PUBLIC_API_URL (never hardcoded per-environment).
 * Every request attaches the current Clerk session token so the backend can
 * verify identity server-side — the client never sends a trusted user ID.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Clerk token from useAuth().getToken() — optional for public endpoints. */
  token?: string | null;
}

function buildUrl(path: string): string {
  return `${API_URL}/api/v1${path}`;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(buildUrl(path), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) {
    const message = await res
      .json()
      .then((data) => (typeof data.error === "string" ? data.error : `Request failed`))
      .catch(() => `Request failed with status ${res.status}`);
    throw new ApiError(res.status, message);
  }

  return res.json() as Promise<T>;
}

export const api = {
  health: () => fetch(`${API_URL}/health`).then((r) => r.json() as Promise<{ status: string }>),
  me: (token: string | null) => apiFetch<{ id: string; email: string; name: string; role: string }>("/me", { token }),
};
