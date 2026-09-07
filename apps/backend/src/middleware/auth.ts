import { createClerkClient, verifyToken } from "@clerk/backend";
import type { NextFunction, Request, Response } from "express";

import type { Env } from "../config/env.js";

export interface AuthedRequest extends Request {
  auth?: {
    userId: string;
    name: string;
    email: string;
  };
}

let clerkClient: ReturnType<typeof createClerkClient> | null = null;

function getClerkClient(env: Env) {
  if (!clerkClient) {
    clerkClient = createClerkClient({
      secretKey: env.CLERK_SECRET_KEY,
    });
  }
  return clerkClient;
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

/**
 * Verifies the Clerk session token from the Authorization header and attaches
 * the verified identity to the request. The client is never trusted for
 * identity — everything comes from Clerk's server-side verification.
 */
export function requireAuth(env: Env) {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      const payload = await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY });
      const sub = payload?.sub;
      if (!sub) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      // Pull a fresh, verified profile for name/email.
      let name = "";
      let email = "";
      try {
        const user = await getClerkClient(env).users.getUser(sub);
        name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
        email = user.primaryEmailAddress?.emailAddress ?? "";
      } catch {
        // Verification already proved identity; profile fetch is best-effort.
      }

      req.auth = { userId: sub, name, email };
      next();
    } catch {
      // Invalid/expired token — same generic response as missing auth.
      res.status(401).json({ error: "Unauthorized" });
    }
  };
}

/**
 * Role gate. Reads the application role from Postgres (source of truth for
 * roles lives in our database, not in Clerk). Must run after requireAuth.
 */
export function requireRole(env: Env, ...roles: Array<"ADMIN" | "TEAM_MEMBER">) {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.auth) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      const { getPool } = await import("../lib/db.js");
      const result = await getPool(env).query<{ role: "ADMIN" | "TEAM_MEMBER" }>(
        "SELECT role FROM users WHERE clerk_user_id = $1",
        [req.auth.userId]
      );
      const role = result.rows[0]?.role;
      if (!role || !roles.includes(role)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      next();
    } catch {
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
