import { Router, type Request, type Response } from "express";
import { z } from "zod";

import type { Env } from "../config/env.js";
import {
  addEventMember,
  checkDatabase,
  createEvent,
  deleteEvent,
  getEventById,
  getUserByClerkId,
  getUserById,
  isEventMember,
  listEventMembers,
  listEventsForUser,
  listUsers,
  removeEventMember,
  setUserRole,
  updateEvent,
  upsertUserFromClerk,
  type DbEvent,
  type DbUser,
} from "../lib/db.js";
import { getClerkClientForEnv } from "../lib/clerk.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { requireRole } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";

export interface CreateRouterOptions {
  env: Env;
}

const createEventSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  location: z.string().max(200).optional(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  status: z.enum(["draft", "active", "completed"]).optional(),
});

const updateEventSchema = createEventSchema.partial();

const inviteSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
});

const assignSchema = z.object({ user_id: z.string().uuid() });
const roleSchema = z.object({ role: z.enum(["ADMIN", "TEAM_MEMBER"]) });

/**
 * Resolve the Postgres row for the verified Clerk identity on the request.
 * Identity comes from requireAuth (verified Clerk token) — never the client.
 */
export async function resolveAppUser(env: Env, req: Request): Promise<DbUser> {
  const auth = (req as AuthedRequest).auth;
  if (!auth) throw new HttpError(401, "Unauthorized");
  const user = await getUserByClerkId(env, auth.userId);
  if (!user) {
    // Verified Clerk identity with no app row yet — provision per role policy
    // (invited → their invitation role; self-signup → ADMIN).
    return upsertUserFromClerk(env, {
      id: auth.userId,
      name: auth.name,
      email: auth.email,
      invitedRole: auth.invitedRole,
    });
  }
  return user;
}

export function createApiRouter({ env }: CreateRouterOptions): Router {
  const router = Router();

  // ------------------------------------------------------------------
  // Health & identity
  // ------------------------------------------------------------------

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
    const user = await upsertUserFromClerk(env, {
      id: auth.userId,
      name: auth.name,
      email: auth.email,
      invitedRole: auth.invitedRole,
    });
    res.json({
      id: user.clerk_user_id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  }) as unknown as import("express").RequestHandler);

  // ------------------------------------------------------------------
  // Team members (ADMIN only)
  // ------------------------------------------------------------------

  router.get("/team-members", requireRole(env, "ADMIN"), (async (_req: Request, res: Response) => {
    const users = await listUsers(env);
    res.json({ members: users.map(serializeUser) });
  }) as unknown as import("express").RequestHandler);

  /**
   * Invite a team member: creates a Clerk invitation (emails the invitee)
   * and pre-creates the Postgres row with role TEAM_MEMBER keyed by a
   * `pending:` placeholder clerk_user_id. When the invitee accepts and signs
   * in, upsertUserFromClerk matches by their real clerk_user_id — so the
   * pre-created row is NOT claimed (emails differ); a fresh row is created
   * and the pending row is marked claimed by email→row update. Simpler and
   * safer: we keep the pending row for the UI and link it to the real Clerk
   * identity the first time that identity signs in with the same email.
   */
  router.post("/team-members/invite", requireRole(env, "ADMIN"), (async (
    req: Request,
    res: Response
  ) => {
    const parsed = inviteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
      return;
    }
    const { name, email } = parsed.data;

    // Send the Clerk invitation. Duplicate invitations (422) are tolerated —
    // the row below is still ensured so the UI shows the invited member.
    // The invitation stamps role:'TEAM_MEMBER' into the invitee's Clerk
    // publicMetadata on acceptance, so invited members provision as
    // TEAM_MEMBER (self-signups default to ADMIN — see upsertUserFromClerk).
    try {
      await getClerkClientForEnv(env).invitations.createInvitation({
        emailAddress: email,
        notify: true,
        publicMetadata: {
          invited_by: (req as AuthedRequest).auth?.userId ?? null,
          role: "TEAM_MEMBER",
        },
      });
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status !== 422) {
        console.error("Clerk invitation failed:", (err as Error).message);
        res.status(502).json({ error: "Failed to send invitation" });
        return;
      }
    }

    // Ensure the application row (idempotent on email).
    const users = await listUsers(env);
    const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      res.status(200).json({ member: serializeUser(existing), invited: true });
      return;
    }
    const { getPool } = await import("../lib/db.js");
    const result = await getPool(env).query<DbUser>(
      `INSERT INTO users (clerk_user_id, name, email, role)
       VALUES ($1, $2, $3, 'TEAM_MEMBER')
       RETURNING *`,
      [`pending:${email.toLowerCase()}`, name, email]
    );
    res.status(201).json({ member: serializeUser(result.rows[0]!), invited: true });
  }) as unknown as import("express").RequestHandler);

  /**
   * Change a user's application role. Backend-only decision: the actor cannot
   * change their own role, and the last remaining ADMIN can never be demoted
   * (guarantees the system always has at least one admin).
   */
  router.patch("/team-members/:id/role", requireRole(env, "ADMIN"), (async (
    req: Request,
    res: Response
  ) => {
    const parsed = roleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
      return;
    }
    const target = await getUserById(env, String(req.params.id));
    if (!target) {
      res.status(404).json({ error: "Team member not found" });
      return;
    }
    const actor = await resolveAppUser(env, req);
    if (target.id === actor.id) {
      res.status(403).json({ error: "You cannot change your own role" });
      return;
    }
    if (target.role === "ADMIN" && parsed.data.role === "TEAM_MEMBER") {
      const admins = (await listUsers(env)).filter((u) => u.role === "ADMIN");
      if (admins.length <= 1) {
        res.status(409).json({ error: "Cannot demote the last admin" });
        return;
      }
    }
    const updated = await setUserRole(env, target.id, parsed.data.role);
    if (!updated) {
      res.status(404).json({ error: "Team member not found" });
      return;
    }
    res.json({ member: serializeUser(updated) });
  }) as unknown as import("express").RequestHandler);

  /**
   * Remove a team member (revoke access). The pending row's clerk_user_id is
   * a `pending:` placeholder, so deletion is safe. Real users keep their
   * Clerk account (auth remains in Clerk) but lose the app row → 401 on
   * next API call, and event memberships cascade.
   */
  router.delete("/team-members/:id", requireRole(env, "ADMIN"), (async (
    req: Request,
    res: Response
  ) => {
    const target = await getUserById(env, String(req.params.id));
    if (!target) {
      res.status(404).json({ error: "Team member not found" });
      return;
    }
    const actor = await resolveAppUser(env, req);
    if (target.id === actor.id) {
      res.status(403).json({ error: "You cannot remove your own account" });
      return;
    }
    if (target.role === "ADMIN") {
      res.status(403).json({ error: "Demote the admin before removing them" });
      return;
    }
    const { getPool } = await import("../lib/db.js");
    await getPool(env).query("DELETE FROM users WHERE id = $1", [target.id]);
    res.status(204).send();
  }) as unknown as import("express").RequestHandler);

  // ------------------------------------------------------------------
  // Events
  // ------------------------------------------------------------------

  router.get("/events", (async (req: Request, res: Response) => {
    const user = await resolveAppUser(env, req);
    const events = await listEventsForUser(env, user);
    res.json({ events: events.map(serializeEvent) });
  }) as unknown as import("express").RequestHandler);

  router.post("/events", requireRole(env, "ADMIN"), (async (req: Request, res: Response) => {
    const parsed = createEventSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
      return;
    }
    const actor = await resolveAppUser(env, req);
    const event = await createEvent(env, actor.id, parsed.data);
    res.status(201).json({ event: serializeEvent(event) });
  }) as unknown as import("express").RequestHandler);

  router.get("/events/:id", (async (req: Request, res: Response) => {
    const user = await resolveAppUser(env, req);
    const event = await getEventById(env, String(req.params.id));
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    // Relationship check: admins pass; members need an event_team_members row.
    if (user.role !== "ADMIN" && !(await isEventMember(env, event.id, user.id))) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    res.json({ event: serializeEvent(event) });
  }) as unknown as import("express").RequestHandler);

  router.patch("/events/:id", requireRole(env, "ADMIN"), (async (req: Request, res: Response) => {
    const parsed = updateEventSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
      return;
    }
    const event = await getEventById(env, String(req.params.id));
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    const updated = await updateEvent(env, event.id, parsed.data);
    res.json({ event: serializeEvent(updated!) });
  }) as unknown as import("express").RequestHandler);

  router.delete("/events/:id", requireRole(env, "ADMIN"), (async (req: Request, res: Response) => {
    const event = await getEventById(env, String(req.params.id));
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    await deleteEvent(env, event.id);
    res.status(204).send();
  }) as unknown as import("express").RequestHandler);

  // ------------------------------------------------------------------
  // Event team membership
  // ------------------------------------------------------------------

  router.get("/events/:id/team-members", (async (req: Request, res: Response) => {
    const user = await resolveAppUser(env, req);
    const event = await getEventById(env, String(req.params.id));
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    if (user.role !== "ADMIN" && !(await isEventMember(env, event.id, user.id))) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const members = await listEventMembers(env, event.id);
    res.json({ members: members.map(serializeMember) });
  }) as unknown as import("express").RequestHandler);

  router.post("/events/:id/team-members", requireRole(env, "ADMIN"), (async (
    req: Request,
    res: Response
  ) => {
    const parsed = assignSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
      return;
    }
    const event = await getEventById(env, String(req.params.id));
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    const target = await getUserById(env, parsed.data.user_id);
    if (!target) {
      res.status(404).json({ error: "Team member not found" });
      return;
    }
    if (target.clerk_user_id.startsWith("pending:")) {
      res.status(409).json({ error: "This member hasn't accepted their invite yet" });
      return;
    }
    const actor = await resolveAppUser(env, req);
    const membership = await addEventMember(env, event.id, target.id, actor.id);
    res.status(201).json({ membership: serializeMember({ ...membership, user: target }) });
  }) as unknown as import("express").RequestHandler);

  router.delete("/events/:id/team-members/:userId", requireRole(env, "ADMIN"), (async (
    req: Request,
    res: Response
  ) => {
    const event = await getEventById(env, String(req.params.id));
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    const removed = await removeEventMember(env, event.id, String(req.params.userId));
    if (!removed) {
      res.status(404).json({ error: "Membership not found" });
      return;
    }
    res.status(204).send();
  }) as unknown as import("express").RequestHandler);

  void requireRole;
  return router;
}

// ---------------------------------------------------------------------------
// Serializers
// ---------------------------------------------------------------------------

export type SerializedUser = {
  id: string;
  clerk_user_id: string;
  name: string;
  email: string;
  role: "ADMIN" | "TEAM_MEMBER";
  pending: boolean;
  created_at: string;
};

export function serializeUser(u: DbUser): SerializedUser {
  return {
    id: u.id,
    clerk_user_id: u.clerk_user_id,
    name: u.name,
    email: u.email,
    role: u.role,
    pending: u.clerk_user_id.startsWith("pending:"),
    created_at: new Date(u.created_at).toISOString(),
  };
}

export function serializeEvent(e: DbEvent) {
  return {
    id: e.id,
    name: e.name,
    description: e.description,
    location: e.location,
    date: e.event_date,
    status: e.status,
    createdAt: new Date(e.created_at).toISOString(),
  };
}

export function serializeMember(m: { user: DbUser; added_at: Date; added_by: string | null }) {
  return {
    ...serializeUser(m.user),
    added_at: new Date(m.added_at).toISOString(),
    added_by: m.added_by,
  };
}
