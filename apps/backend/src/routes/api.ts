import { Router, type Request, type Response } from "express";

import type { Env } from "../config/env.js";
import { checkDatabase, upsertUserFromClerk } from "../lib/db.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export interface CreateRouterOptions {
  env: Env;
}

export function createApiRouter({ env }: CreateRouterOptions): Router {
  const router = Router();

  router.get("/health", async (_req, res) => {
    const dbOk = await checkDatabase(env).catch(() => false);
    if (!dbOk) {
      res.status(503).json({ status: "degraded", database: "down" });
      return;
    }
    res.json({ status: "ok" });
  });

  router.get("/me", (async (req: Request, res: Response) => {
    const auth = (req as AuthedRequest).auth;
    if (!auth) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Sync the Clerk profile into our users table (JIT provisioning).
    const user = await upsertUserFromClerk(env, {
      id: auth.userId,
      name: auth.name,
      email: auth.email,
    });

    res.json({
      id: user.clerk_user_id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  }) as unknown as import("express").RequestHandler);

  // Authorization foundation — used by admin-only routes in later phases.
  router.get("/admin/ping", requireRole(env, "ADMIN"), (_req, res) => {
    res.json({ status: "ok" });
  });

  void requireAuth;
  void requireRole;

  return router;
}
