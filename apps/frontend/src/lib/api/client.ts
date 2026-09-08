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

  // ---- Team management (ADMIN) ----
  listMembers: (token: string | null) => apiFetch<{ members: TeamMemberApi[] }>("/team-members", { token }),
  inviteMember: (
    token: string | null,
    input: { name: string; email: string }
  ) => apiFetch<{ member: TeamMemberApi; invited: boolean }>("/team-members/invite", { method: "POST", body: input, token }),
  setMemberRole: (
    token: string | null,
    id: string,
    role: "ADMIN" | "TEAM_MEMBER"
  ) => apiFetch<{ member: TeamMemberApi }>(`/team-members/${id}/role`, { method: "PATCH", body: { role }, token }),
  removeMember: (token: string | null, id: string) =>
    apiFetch<void>(`/team-members/${id}`, { method: "DELETE", token }),

  // ---- Events ----
  listEvents: (token: string | null) => apiFetch<{ events: EventApi[] }>("/events", { token }),
  createEvent: (
    token: string | null,
    input: { name: string; description?: string; location?: string; event_date: string; status?: string }
  ) => apiFetch<{ event: EventApi }>("/events", { method: "POST", body: input, token }),
  getEvent: (token: string | null, id: string) =>
    apiFetch<{ event: EventApi }>(`/events/${id}`, { token }),
  updateEvent: (
    token: string | null,
    id: string,
    input: { name?: string; description?: string; location?: string; event_date?: string; status?: string }
  ) => apiFetch<{ event: EventApi }>(`/events/${id}`, { method: "PATCH", body: input, token }),
  deleteEvent: (token: string | null, id: string) =>
    apiFetch<void>(`/events/${id}`, { method: "DELETE", token }),

  // ---- Event team membership ----
  listEventMembers: (token: string | null, eventId: string) =>
    apiFetch<{ members: TeamMemberApi[] }>(`/events/${eventId}/team-members`, { token }),
  assignEventMember: (token: string | null, eventId: string, userId: string) =>
    apiFetch<{ membership: TeamMemberApi }>(`/events/${eventId}/team-members`, {
      method: "POST",
      body: { user_id: userId },
      token,
    }),
  removeEventMember: (token: string | null, eventId: string, userId: string) =>
    apiFetch<void>(`/events/${eventId}/team-members/${userId}`, { method: "DELETE", token }),
};

export interface TeamMemberApi {
  id: string;
  clerk_user_id: string;
  name: string;
  email: string;
  role: "ADMIN" | "TEAM_MEMBER";
  pending: boolean;
  created_at: string;
  added_at?: string;
}

export interface EventApi {
  id: string;
  name: string;
  description: string;
  location: string;
  date: string;
  status: "draft" | "active" | "completed";
  createdAt: string;
}
