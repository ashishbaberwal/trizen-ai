"use client";

import * as React from "react";
import { useAuth } from "@clerk/nextjs";

import { api } from "@/lib/api/client";
import type { User } from "@/types";
import { currentUser } from "@/lib/mock-data";

/**
 * CurrentUserProvider — seam between Clerk auth state and the existing UI.
 *
 * While the dashboard is still served by the mock service layer, this hook
 * maps the verified Clerk session onto the existing `User` shape. The API
 * call below already hits the real backend; when the rest of the services
 * switch over, components keep consuming `useCurrentUser()` unchanged.
 */
export function useCurrentUser(): User {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [user, setUser] = React.useState<User>(currentUser);

  React.useEffect(() => {
    let cancelled = false;
    if (!isLoaded || !isSignedIn) return;
    void (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const me = await api.me(token);
        if (cancelled) return;
        setUser({
          id: me.id,
          name: me.name || "Studio member",
          email: me.email,
          role: me.role === "ADMIN" ? "admin" : "member",
        });
      } catch {
        // Backend not reachable yet — keep the current user shape.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken, isLoaded, isSignedIn]);

  return user;
}
