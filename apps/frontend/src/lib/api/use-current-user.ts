"use client";

import * as React from "react";
import { useAuth } from "@clerk/nextjs";

import { api } from "@/lib/api/client";
import type { User } from "@/types";

/**
 * Placeholder identity used only for rendering while the verified role is
 * unavailable (loading or backend unreachable). It is deliberately
 * member-safe: the UI must never grant admin affordances on a fallback.
 */
export const MEMBER_SAFE_USER: User = {
  id: "unverified",
  name: "",
  email: "",
  role: "member",
};

export type CurrentUserState = {
  /** null until the verified role has loaded from the backend. */
  user: User | null;
  loading: boolean;
};

/**
 * Seam between Clerk auth state and the existing UI.
 *
 * The role shown in the UI comes from the backend (`GET /api/v1/me` —
 * Postgres is authoritative). It is UX-only: the backend re-verifies the
 * Clerk token and re-reads the role on every request.
 */
export function useCurrentUserState(): CurrentUserState {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [state, setState] = React.useState<CurrentUserState>({
    user: null,
    loading: true,
  });

  React.useEffect(() => {
    let cancelled = false;
    if (!isLoaded) return;
    if (!isSignedIn) {
      // Defer so the state update doesn't fire synchronously inside the effect.
      const t = setTimeout(() => setState({ user: null, loading: false }), 0);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }
    void (async () => {
      try {
        const token = await getToken();
        if (!token) {
          if (!cancelled) setState({ user: null, loading: false });
          return;
        }
        const me = await api.me(token);
        if (cancelled) return;
        setState({
          user: {
            id: me.id,
            name: me.name || "Studio member",
            email: me.email,
            role: me.role === "ADMIN" ? "admin" : "member",
          },
          loading: false,
        });
      } catch {
        // Backend unreachable — don't grant admin UI; show member-safe shell.
        if (!cancelled) setState({ user: null, loading: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken, isLoaded, isSignedIn]);

  return state;
}
