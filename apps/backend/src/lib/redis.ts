import Redis from "ioredis"

let client: Redis | null = null
let disabled = false

/** Shared Redis client for rate limits, idempotency, and store cache. */
export function getRedis(): Redis | null {
  if (disabled) return null
  const url = process.env.REDIS_URL?.trim()
  if (!url) return null

  if (!client) {
    client = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    })
    client.on("error", (err) => {
      if (process.env.NODE_ENV === "development") {
        console.warn("[redis] connection error — falling back to in-memory", err.message)
      }
    })
  }

  return client
}

export async function redisReady(): Promise<boolean> {
  const redis = getRedis()
  if (!redis) return false
  try {
    if (redis.status !== "ready") {
      await redis.connect()
    }
    await redis.ping()
    return true
  } catch {
    return false
  }
}

export async function redisGet(key: string): Promise<string | null> {
  const redis = getRedis()
  if (!redis || !(await redisReady())) return null
  try {
    return await redis.get(key)
  } catch {
    return null
  }
}

export async function redisSetEx(
  key: string,
  ttlSec: number,
  value: string,
): Promise<boolean> {
  const redis = getRedis()
  if (!redis || !(await redisReady())) return false
  try {
    await redis.set(key, value, "EX", ttlSec)
    return true
  } catch {
    return false
  }
}

/** SET key value EX ttl NX — returns true when the key was newly set. */
export async function redisSetNxEx(
  key: string,
  ttlSec: number,
  value = "1",
): Promise<boolean | null> {
  const redis = getRedis()
  if (!redis || !(await redisReady())) return null
  try {
    const result = await redis.set(key, value, "EX", ttlSec, "NX")
    return result === "OK"
  } catch {
    return null
  }
}

export async function redisIncrWindow(
  key: string,
  windowSec: number,
): Promise<number | null> {
  const redis = getRedis()
  if (!redis || !(await redisReady())) return null
  try {
    const count = await redis.incr(key)
    if (count === 1) {
      await redis.expire(key, windowSec)
    }
    return count
  } catch {
    return null
  }
}

export async function redisTtl(key: string): Promise<number | null> {
  const redis = getRedis()
  if (!redis || !(await redisReady())) return null
  try {
    return await redis.ttl(key)
  } catch {
    return null
  }
}

export async function redisDelByPrefix(prefix: string): Promise<void> {
  const redis = getRedis()
  if (!redis || !(await redisReady())) return
  try {
    let cursor = "0"
    do {
      const [next, keys] = await redis.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 100)
      cursor = next
      if (keys.length) await redis.del(...keys)
    } while (cursor !== "0")
  } catch {
    /* best-effort invalidation */
  }
}
