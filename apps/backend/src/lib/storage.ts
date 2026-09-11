import { randomUUID } from "node:crypto";
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

// ---------------------------------------------------------------------------
// Photo storage operations
// ---------------------------------------------------------------------------

/** Allowed upload MIME types (never trust the file extension alone). */
export const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/** 25 MB per photo — matches a real photography workflow without being lax. */
export const MAX_PHOTO_BYTES = 25 * 1024 * 1024;

export type StoredPhoto = {
  storageFileId: string;
  size: number;
};

/**
 * Upload a photo buffer to Appwrite under a collision-resistant UUID.
 * The original filename is preserved as Appwrite file metadata only —
 * never used as the storage identifier (no path traversal, no clobbering).
 */
export async function uploadPhoto(
  env: Env,
  buffer: Buffer,
  mimeType: string,
  originalFilename: string
): Promise<StoredPhoto> {
  const storageFileId = randomUUID();
  // node-appwrite v29 accepts native File objects. The original filename is
  // preserved as Appwrite file metadata only — never used as the storage
  // identifier (no path traversal, no clobbering).
  const file = new File([buffer], originalFilename, { type: mimeType });
  await getStorage(env).createFile({
    bucketId: env.APPWRITE_BUCKET_ID,
    fileId: storageFileId,
    file,
  });
  return { storageFileId, size: buffer.byteLength };
}

/** Best-effort cleanup when a later step (e.g. metadata insert) fails. */
export async function deletePhotoQuietly(env: Env, storageFileId: string): Promise<void> {
  try {
    await getStorage(env).deleteFile({
      bucketId: env.APPWRITE_BUCKET_ID,
      fileId: storageFileId,
    });
  } catch (err) {
    // Orphaned object is preferable to failing the request twice — log only.
    console.error(`Appwrite cleanup failed for ${storageFileId}:`, (err as Error).message);
  }
}

/**
 * Read photo bytes through the server (API-key authenticated). The public
 * gallery streams photos through this instead of handing out direct
 * Appwrite view URLs, so access is gated by the backend on every request.
 */
export async function readPhotoBytes(env: Env, storageFileId: string): Promise<Buffer> {
  const view = await getStorage(env).getFileView({
    bucketId: env.APPWRITE_BUCKET_ID,
    fileId: storageFileId,
  });
  return Buffer.from(view as ArrayBuffer);
}

/**
 * Build a stable, public download URL for a stored photo. The bucket is
 * file-security enabled; backend permission grants access, so the plain
 * view URL works for <img> tags without exposing any API key.
 */
export function photoUrl(env: Env, storageFileId: string): string {
  const base = env.APPWRITE_ENDPOINT.replace(/\/v1\/?$/, "");
  return `${base}/v1/storage/buckets/${env.APPWRITE_BUCKET_ID}/files/${storageFileId}/view?project=${env.APPWRITE_PROJECT_ID}`;
}

/**
 * Download variant of the photo URL. Appwrite's /download endpoint serves
 * `Content-Disposition: attachment` with the original filename, so browsers
 * download instead of navigating — no API key involved, same as photoUrl.
 */
export function photoDownloadUrl(env: Env, storageFileId: string): string {
  const base = env.APPWRITE_ENDPOINT.replace(/\/v1\/?$/, "");
  return `${base}/v1/storage/buckets/${env.APPWRITE_BUCKET_ID}/files/${storageFileId}/download?project=${env.APPWRITE_PROJECT_ID}`;
}
