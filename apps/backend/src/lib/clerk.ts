import { createClerkClient } from "@clerk/backend";

import type { Env } from "../config/env.js";

let client: ReturnType<typeof createClerkClient> | null = null;

/** Shared Clerk backend client for invitations/user management. */
export function getClerkClientForEnv(env: Env) {
  if (!client) {
    client = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
  }
  return client;
}
