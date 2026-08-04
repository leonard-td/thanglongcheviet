import { redisSetNxEx } from "./redis"

const memoryKeys = new Map<string, number>()

function purgeMemory() {
  const now = Date.now()
  for (const [key, expiresAt] of memoryKeys) {
    if (now >= expiresAt) memoryKeys.delete(key)
  }
}

/**
 * Claim an idempotency key. Returns:
 * - `true`  — first time seeing this key (proceed)
 * - `false` — duplicate (skip processing)
 * - `null`  — Redis unavailable; caller should use DB dedupe fallback
 */
export async function claimIdempotencyKey(
  key: string,
  ttlSec: number,
): Promise<boolean | null> {
  const redisResult = await redisSetNxEx(`idempotency:${key}`, ttlSec)
  if (redisResult !== null) return redisResult

  purgeMemory()
  const fullKey = `idempotency:${key}`
  if (memoryKeys.has(fullKey)) return false
  memoryKeys.set(fullKey, Date.now() + ttlSec * 1000)
  return true
}
