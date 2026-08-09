import { appendFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import type { QueryLanguage } from './classifier'
import type { QueryType } from './query/types'

export type MissLogEntry = {
  q: string
  kind: string
  reason: string
  topScore?: number
  intentId?: string
  lang?: QueryLanguage
  contactEmail?: string
  /** docs/24 §9 — Query Understanding fields (QueryType or MappedRoute). */
  predictedType?: QueryType | string
  confidence?: number
  executedRoute?: string
  at: string
}

export type RecurringMiss = {
  q: string
  count: number
  reasons: string[]
  lastAt: string
}

const misses: MissLogEntry[] = []

function persistEnabled(): boolean {
  return process.env.MISS_LOG_PERSIST?.trim() === '1'
}

function persistPath(): string {
  const raw = process.env.MISS_LOG_PATH?.trim()
  if (raw) return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw)
  return path.join(process.cwd(), '.data', 'retrieval-misses.jsonl')
}

async function appendPersist(entry: MissLogEntry): Promise<void> {
  if (!persistEnabled()) return
  try {
    const file = persistPath()
    await mkdir(path.dirname(file), { recursive: true })
    await appendFile(file, `${JSON.stringify(entry)}\n`, 'utf8')
  } catch {
    // Persistence must not break Ask
  }
}

/** Retrieval / query outcome log — memory always; JSONL when MISS_LOG_PERSIST=1. */
export function logMiss(entry: Omit<MissLogEntry, 'at'> & { at?: string }): void {
  const full: MissLogEntry = {
    ...entry,
    at: entry.at ?? new Date().toISOString(),
  }
  misses.push(full)
  void appendPersist(full)
}

/** Alias for docs/24 learn-loop — every Ask terminal outcome. */
export const logQueryOutcome = logMiss

export function listMisses(): MissLogEntry[] {
  return [...misses]
}

export function resetMissLog(): void {
  misses.length = 0
}

export function summarizeRecurringMisses(
  minCount = 2,
  source: readonly MissLogEntry[] = misses,
): RecurringMiss[] {
  const byQ = new Map<string, { count: number; reasons: Set<string>; lastAt: string; q: string }>()

  for (const entry of source) {
    const key = entry.q.trim().toLowerCase()
    if (!key) continue
    const cur = byQ.get(key)
    if (!cur) {
      byQ.set(key, {
        q: entry.q.trim(),
        count: 1,
        reasons: new Set([entry.reason]),
        lastAt: entry.at,
      })
    } else {
      cur.count += 1
      cur.reasons.add(entry.reason)
      if (entry.at > cur.lastAt) cur.lastAt = entry.at
    }
  }

  return [...byQ.values()]
    .filter((row) => row.count >= minCount)
    .map((row) => ({
      q: row.q,
      count: row.count,
      reasons: [...row.reasons].sort(),
      lastAt: row.lastAt,
    }))
    .sort((a, b) => b.count - a.count || a.q.localeCompare(b.q))
}
