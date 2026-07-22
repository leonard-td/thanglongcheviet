import { redisDelByPrefix, redisGet, redisSetEx } from "./redis"

type Entry = { value: unknown; expiresAt: number }

const memory = new Map<string, Entry>()

function purgeExpired() {
  const now = Date.now()
  for (const [key, entry] of memory) {
    if (now >= entry.expiresAt) memory.delete(key)
  }
}

export function getCached<T>(key: string): T | undefined {
  purgeExpired()
  const hit = memory.get(key)
  if (!hit || Date.now() >= hit.expiresAt) {
    memory.delete(key)
    return undefined
  }
  return hit.value as T
}

export async function getCachedAsync<T>(key: string): Promise<T | undefined> {
  const redisRaw = await redisGet(`storecache:${key}`)
  if (redisRaw) {
    try {
      return JSON.parse(redisRaw) as T
    } catch {
      /* fall through */
    }
  }
  return getCached<T>(key)
}

export function setCached(key: string, value: unknown, ttlMs: number) {
  memory.set(key, { value, expiresAt: Date.now() + ttlMs })
  const ttlSec = Math.max(1, Math.ceil(ttlMs / 1000))
  void redisSetEx(`storecache:${key}`, ttlSec, JSON.stringify(value))
}

export function invalidateStoreCache(prefix?: string) {
  if (!prefix) {
    memory.clear()
    void redisDelByPrefix("storecache:")
    return
  }
  for (const key of memory.keys()) {
    if (key.startsWith(prefix)) memory.delete(key)
  }
  void redisDelByPrefix(`storecache:${prefix}`)
}

export const STORE_CACHE_TTL = {
  navigations: 5 * 60_000,
  siteSettings: 5 * 60_000,
  cards: 60 * 60_000,
  bootstrap: 5 * 60_000,
  campaignTopics: 5 * 60_000,
} as const

export function setPublicCacheHeaders(res: { setHeader: (k: string, v: string) => void }, maxAgeSec: number) {
  res.setHeader("Cache-Control", `public, max-age=${maxAgeSec}, stale-while-revalidate=60`)
}
