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
 */
export async function upsertUserFromClerk(
  env: Env,
  clerkUser: { id: string; name: string; email: string }
): Promise<DbUser> {
  const result = await getPool(env).query<DbUser>(
    `INSERT INTO users (clerk_user_id, name, email, role)
     VALUES ($1, $2, $3, 'TEAM_MEMBER')
     ON CONFLICT (clerk_user_id)
     DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, updated_at = now()
     RETURNING *`,
    [clerkUser.id, clerkUser.name, clerkUser.email]
  );
  return result.rows[0]!;
}
