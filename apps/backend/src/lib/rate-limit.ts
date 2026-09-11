/**
 * In-memory sliding-window rate limiter for public PIN verification.
 *
 * Keyed by "slug:ip". Keeps a bounded brute-force surface on the only
 * unauthenticated endpoint that holds a secret. Single-process only — a
 * multi-instance deployment must move this to Postgres or Redis, otherwise
 * each instance gets its own budget.
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
/** Hard cap so unknown slugs spamming the map cannot grow it unbounded. */
const MAX_KEYS = 10_000;

const failures = new Map<string, number[]>();

function prune(key: string, now: number): number[] {
  const list = (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length === 0) failures.delete(key);
  else failures.set(key, list);
  return list;
}

/** True when this key has burned its failure budget for the current window. */
export function isRateLimited(key: string): boolean {
  return prune(key, Date.now()).length >= MAX_FAILURES;
}

export function recordFailure(key: string): void {
  const now = Date.now();
  if (!failures.has(key) && failures.size >= MAX_KEYS) {
    // Evict expired keys wholesale before admitting a new one.
    for (const k of failures.keys()) {
      if (prune(k, now).length === 0) break;
    }
  }
  const list = prune(key, now);
  list.push(now);
  failures.set(key, list);
}

/** Successful verification wipes the slate for this key. */
export function clearFailures(key: string): void {
  failures.delete(key);
}
