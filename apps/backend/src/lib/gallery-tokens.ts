import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import type { Env } from "../config/env.js";

/**
 * Signed access tokens for the public gallery surface.
 *
 * A successful PIN unlock mints an HMAC token bound to the gallery slug and
 * an expiry. Photo bytes are then served through the backend (never as raw
 * Appwrite URLs), and every photo request re-verifies the token — so a
 * leaked image URL stops working when the token expires and cannot be
 * replayed against a different gallery.
 */

export const GALLERY_TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

function tokenSecret(env: Env): string {
  // A dedicated secret is preferred; deriving from the Clerk key keeps
  // every deployment working without a new required variable.
  return (
    env.GALLERY_TOKEN_SECRET ??
    createHash("sha256").update(`frameflow-gallery:${env.CLERK_SECRET_KEY}`).digest("hex")
  );
}

/** Mint `${expiresAt}.${hmac}` for one gallery slug. */
export function signGalleryAccessToken(env: Env, slug: string, expiresAt: number): string {
  const mac = createHmac("sha256", tokenSecret(env))
    .update(`${slug}.${expiresAt}`)
    .digest("base64url");
  return `${expiresAt}.${mac}`;
}

/** Constant-time verify: well-formed, unexpired, and signed for THIS slug. */
export function verifyGalleryAccessToken(env: Env, slug: string, token: string): boolean {
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const expiresAt = Number(token.slice(0, dot));
  const mac = token.slice(dot + 1);
  if (!Number.isFinite(expiresAt) || !mac || Date.now() > expiresAt) return false;
  const expected = createHmac("sha256", tokenSecret(env))
    .update(`${slug}.${expiresAt}`)
    .digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
