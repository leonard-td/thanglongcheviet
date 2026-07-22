import { redisIncrWindow, redisTtl } from "./redis"

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

function checkMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterSec: 0 }
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    }
  }

  bucket.count += 1
  return { allowed: true, retryAfterSec: 0 }
}

/** Fixed-window rate limiter — Redis when available, in-memory fallback. */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000))
  const redisKey = `ratelimit:${key}`

  const count = await redisIncrWindow(redisKey, windowSec)
  if (count !== null) {
    if (count > limit) {
      const ttl = (await redisTtl(redisKey)) ?? windowSec
      return {
        allowed: false,
        retryAfterSec: Math.max(1, ttl),
      }
    }
    return { allowed: true, retryAfterSec: 0 }
  }

  return checkMemoryRateLimit(key, limit, windowMs)
}

export function clientIp(req: { ip?: string; headers?: Record<string, unknown> }) {
  const forwarded = req.headers?.["x-forwarded-for"]
  if (typeof forwarded === "string" && forwarded.length) {
    return forwarded.split(",")[0]?.trim() || "unknown"
  }
  return req.ip || "unknown"
}
