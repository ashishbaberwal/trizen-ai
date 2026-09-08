import { readFileSync } from "node:fs";
import pg from "pg";

import type { Env } from "../config/env.js";

export type DbUser = {
  id: string;
  clerk_user_id: string;
  name: string;
  email: string;
  role: "ADMIN" | "TEAM_MEMBER";
  created_at: Date;
  updated_at: Date;
};

export type DbEvent = {
  id: string;
  name: string;
  description: string;
  location: string;
  event_date: string;
  status: "draft" | "active" | "completed";
  created_by: string;
  created_at: Date;
  updated_at: Date;
};

export type DbEventMember = {
  event_id: string;
  user_id: string;
  added_by: string | null;
  added_at: Date;
};

let pool: pg.Pool | null = null;

export function getPool(env: Env): pg.Pool {
  if (!pool) {
    // TLS strategy:
    // - DATABASE_SSL_CA set → full verification against Supabase's CA cert
    //   (download from Supabase Dashboard → Database Settings → SSL).
    // - No CA configured: development falls back to relaxed verification
    //   (Supabase's pooler CA is not in Node's trust store); production
    //   requires the CA and refuses to boot without it.
    const isLocal =
      env.DATABASE_URL.includes("localhost") || env.DATABASE_URL.includes("127.0.0.1");

    let ssl: pg.PoolConfig["ssl"] = false;
    if (!isLocal) {
      if (env.DATABASE_SSL_CA) {
        const ca = readFileSync(env.DATABASE_SSL_CA, "utf8");
        ssl = { rejectUnauthorized: true, ca };
      } else if (env.NODE_ENV === "production") {
        throw new Error(
          "DATABASE_SSL_CA is required in production — set it to the Supabase CA cert path"
        );
      } else {
        console.warn(
          "WARNING: DATABASE_SSL_CA not set — TLS chain verification relaxed (development only). " +
            "Download the Supabase CA cert and set DATABASE_SSL_CA for full verification."
        );
        ssl = { rejectUnauthorized: false };
      }
    }

    pool = new pg.Pool({
      connectionString: env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ssl,
    });
    pool.on("error", (err) => {
      // Don't crash the process on idle-client errors; just log.
      console.error("Unexpected PostgreSQL pool error:", err.message);
    });
  }
  return pool;
}

/** Closes the pool — used by graceful shutdown and tests. */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/** Lightweight connectivity check for the health endpoint. */
export async function checkDatabase(env: Env): Promise<boolean> {
  const client = await getPool(env).connect();
  try {
    await client.query("SELECT 1");
    return true;
  } finally {
    client.release();
  }
}

/**
 * Map a verified Clerk user to an application row. Creates the row on first
 * sighting (JIT provisioning) and keeps name/email in sync with Clerk.
 * The Clerk user ID is the stable identity — repeated sign-ins never create
 * duplicate rows, and the role column is never overwritten here.
 *
 * Role policy (set at creation, then immutable through this path):
 * - Self-registered users (no `role` set in Clerk publicMetadata by an
 *   invitation) become ADMIN — per product decision, every account that
 *   signs up on its own is a studio admin.
 * - Invited members carry role:'TEAM_MEMBER' in the invitation's
 *   publicMetadata, so they provision as TEAM_MEMBER.
 *
 * Pending invites: an admin's invite pre-creates a row keyed by the
 * `pending:<email>` placeholder. When the real Clerk identity signs in, that
 * pending row is adopted (clerk_user_id replaced with the real ID) so the
 * team list keeps a single entry per person and any pre-assigned event
 * memberships survive the claim.
 */
export async function upsertUserFromClerk(
  env: Env,
  clerkUser: { id: string; name: string; email: string; invitedRole?: "ADMIN" | "TEAM_MEMBER" }
): Promise<DbUser> {
  const pool = getPool(env);

  // 1. Already linked? Keep name/email fresh, never touch the role.
  const linked = await pool.query<DbUser>(
    `INSERT INTO users (clerk_user_id, name, email, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (clerk_user_id)
     DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, updated_at = now()
     RETURNING *`,
    [clerkUser.id, clerkUser.name, clerkUser.email, clerkUser.invitedRole ?? "ADMIN"]
  );
  const user = linked.rows[0]!;

  // 2. Adopt a pending invite row for the same email (if one exists and it
  //    isn't the row we just upserted). Move its event memberships to the
  //    claimed row, then delete the placeholder.
  const pending = await pool.query<DbUser>(
    "SELECT * FROM users WHERE email = $1 AND clerk_user_id = $2",
    [clerkUser.email, `pending:${clerkUser.email.toLowerCase()}`]
  );
  const pendingRow = pending.rows[0];
  if (pendingRow && pendingRow.id !== user.id) {
    await pool.query(
      `INSERT INTO event_team_members (event_id, user_id, added_by, added_at)
       SELECT event_id, $2, added_by, added_at FROM event_team_members WHERE user_id = $1
       ON CONFLICT (event_id, user_id) DO NOTHING`,
      [pendingRow.id, user.id]
    );
    await pool.query("DELETE FROM event_team_members WHERE user_id = $1", [pendingRow.id]);
    await pool.query("DELETE FROM users WHERE id = $1", [pendingRow.id]);
  }

  return user;
}

/** Fetch the application user row for a verified Clerk user ID. */
export async function getUserByClerkId(env: Env, clerkUserId: string): Promise<DbUser | null> {
  const result = await getPool(env).query<DbUser>(
    "SELECT * FROM users WHERE clerk_user_id = $1",
    [clerkUserId]
  );
  return result.rows[0] ?? null;
}

export async function getUserById(env: Env, id: string): Promise<DbUser | null> {
  const result = await getPool(env).query<DbUser>("SELECT * FROM users WHERE id = $1", [id]);
  return result.rows[0] ?? null;
}

/** All application users, newest first. */
export async function listUsers(env: Env): Promise<DbUser[]> {
  const result = await getPool(env).query<DbUser>(
    "SELECT * FROM users ORDER BY created_at DESC"
  );
  return result.rows;
}

/** Promote/demote an application user. Called only from admin-gated routes. */
export async function setUserRole(
  env: Env,
  userId: string,
  role: "ADMIN" | "TEAM_MEMBER"
): Promise<DbUser | null> {
  const result = await getPool(env).query<DbUser>(
    "UPDATE users SET role = $2, updated_at = now() WHERE id = $1 RETURNING *",
    [userId, role]
  );
  return result.rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export interface CreateEventInput {
  name: string;
  description?: string;
  location?: string;
  event_date: string;
  status?: "draft" | "active" | "completed";
}

export async function createEvent(
  env: Env,
  createdByUserId: string,
  input: CreateEventInput
): Promise<DbEvent> {
  const result = await getPool(env).query<DbEvent>(
    `INSERT INTO events (name, description, location, event_date, status, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.name,
      input.description ?? "",
      input.location ?? "",
      input.event_date,
      input.status ?? "draft",
      createdByUserId,
    ]
  );
  return result.rows[0]!;
}

export async function listEvents(env: Env): Promise<DbEvent[]> {
  const result = await getPool(env).query<DbEvent>(
    "SELECT * FROM events ORDER BY created_at DESC"
  );
  return result.rows;
}

/** Events a user can access: all events for admins, assigned events for members. */
export async function listEventsForUser(env: Env, user: DbUser): Promise<DbEvent[]> {
  if (user.role === "ADMIN") {
    return listEvents(env);
  }
  const result = await getPool(env).query<DbEvent>(
    `SELECT e.* FROM events e
     JOIN event_team_members etm ON etm.event_id = e.id
     WHERE etm.user_id = $1
     ORDER BY e.created_at DESC`,
    [user.id]
  );
  return result.rows;
}

export async function getEventById(env: Env, id: string): Promise<DbEvent | null> {
  const result = await getPool(env).query<DbEvent>("SELECT * FROM events WHERE id = $1", [id]);
  return result.rows[0] ?? null;
}

export interface UpdateEventInput {
  name?: string;
  description?: string;
  location?: string;
  event_date?: string;
  status?: "draft" | "active" | "completed";
}

export async function updateEvent(
  env: Env,
  id: string,
  input: UpdateEventInput
): Promise<DbEvent | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let param = 1;
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    fields.push(`${key} = $${param++}`);
    values.push(value);
  }
  if (fields.length === 0) return getEventById(env, id);
  values.push(id);
  const result = await getPool(env).query<DbEvent>(
    `UPDATE events SET ${fields.join(", ")}, updated_at = now() WHERE id = $${param} RETURNING *`,
    values
  );
  return result.rows[0] ?? null;
}

export async function deleteEvent(env: Env, id: string): Promise<boolean> {
  const result = await getPool(env).query("DELETE FROM events WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Event team membership
// ---------------------------------------------------------------------------

/** Relationship check — the only source of event access for team members. */
export async function isEventMember(
  env: Env,
  eventId: string,
  userId: string
): Promise<boolean> {
  const result = await getPool(env).query(
    "SELECT 1 FROM event_team_members WHERE event_id = $1 AND user_id = $2",
    [eventId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Assign a user to an event. Idempotent: re-assignment never duplicates the
 * relationship (primary key (event_id, user_id) + ON CONFLICT DO NOTHING).
 */
export async function addEventMember(
  env: Env,
  eventId: string,
  userId: string,
  addedBy: string
): Promise<DbEventMember> {
  const result = await getPool(env).query<DbEventMember>(
    `INSERT INTO event_team_members (event_id, user_id, added_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (event_id, user_id) DO NOTHING
     RETURNING *`,
    [eventId, userId, addedBy]
  );
  if (result.rows[0]) return result.rows[0];
  // Already existed — return the existing relationship.
  const existing = await getPool(env).query<DbEventMember>(
    "SELECT * FROM event_team_members WHERE event_id = $1 AND user_id = $2",
    [eventId, userId]
  );
  return existing.rows[0]!;
}

export async function removeEventMember(
  env: Env,
  eventId: string,
  userId: string
): Promise<boolean> {
  const result = await getPool(env).query(
    "DELETE FROM event_team_members WHERE event_id = $1 AND user_id = $2",
    [eventId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

/** All members of an event, joined with their user profiles. */
export async function listEventMembers(
  env: Env,
  eventId: string
): Promise<Array<DbEventMember & { user: DbUser }>> {
  const result = await getPool(env).query<{
    event_id: string;
    user_id: string;
    added_by: string | null;
    added_at: Date;
    clerk_user_id: string;
    name: string;
    email: string;
    role: "ADMIN" | "TEAM_MEMBER";
    user_created_at: Date;
    user_updated_at: Date;
  }>(
    `SELECT etm.event_id, etm.user_id, etm.added_by, etm.added_at,
            u.clerk_user_id, u.name, u.email, u.role,
            u.created_at AS "user_created_at", u.updated_at AS "user_updated_at"
     FROM event_team_members etm
     JOIN users u ON u.id = etm.user_id
     WHERE etm.event_id = $1
     ORDER BY etm.added_at ASC`,
    [eventId]
  );
  return result.rows.map((row) => ({
    event_id: row.event_id,
    user_id: row.user_id,
    added_by: row.added_by,
    added_at: row.added_at,
    user: {
      id: row.user_id,
      clerk_user_id: row.clerk_user_id,
      name: row.name,
      email: row.email,
      role: row.role,
      created_at: row.user_created_at,
      updated_at: row.user_updated_at,
    },
  }));
}
