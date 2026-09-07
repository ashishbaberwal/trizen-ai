import { Client, Storage } from "node-appwrite";

import type { Env } from "../config/env.js";

let storage: Storage | null = null;

/**
 * Server-side Appwrite Storage client. The API key stays on the server;
 * it is never sent to the browser and never logged.
 */
export function getStorage(env: Env): Storage {
  if (!storage) {
    const client = new Client()
      .setEndpoint(env.APPWRITE_ENDPOINT)
      .setProject(env.APPWRITE_PROJECT_ID)
      .setKey(env.APPWRITE_API_KEY);
    storage = new Storage(client);
  }
  return storage;
}

/**
 * Verifies the configured bucket exists and is reachable. Used by startup
 * validation — a misconfigured bucket should fail fast, not at first upload.
 */
export async function checkBucket(env: Env): Promise<boolean> {
  try {
    await getStorage(env).getFile({ bucketId: env.APPWRITE_BUCKET_ID, fileId: "startup-probe" });
    return true;
  } catch (err) {
    const status = (err as { code?: number }).code;
    // 404 means the bucket exists but the probe file doesn't — that's fine.
    if (status === 404) return true;
    // Anything else (401, 403, network, wrong endpoint/project) is fatal.
    return false;
  }
}
