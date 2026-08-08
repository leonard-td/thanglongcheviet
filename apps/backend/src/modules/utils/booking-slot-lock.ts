import { createHash } from "node:crypto"
import { Client } from "pg"

function advisoryKeyParts(lockKey: string): [number, number] {
  const hash = createHash("sha256").update(lockKey).digest()
  return [hash.readInt32BE(0), hash.readInt32BE(4)]
}

/**
 * Serialize concurrent writers for one booking slot using a dedicated DB
 * connection and session-level advisory locks.
 */
export async function withBookingSlotLock<T>(
  date: string,
  time: string,
  fn: () => Promise<T>
): Promise<T> {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for booking slot locking")
  }

  const client = new Client({ connectionString })
  await client.connect()
  const [k1, k2] = advisoryKeyParts(`booking:${date}:${time}`)

  try {
    await client.query("SELECT pg_advisory_lock($1, $2)", [k1, k2])
    return await fn()
  } finally {
    await client.query("SELECT pg_advisory_unlock($1, $2)", [k1, k2]).catch(() => {})
    await client.end()
  }
}

/**
 * Count active bookings for one date/time (committed rows only).
 */
export async function countActiveBookings(
  date: string,
  time: string
): Promise<number> {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for booking capacity checks")
  }

  const client = new Client({ connectionString })
  await client.connect()
  try {
    const result = await client.query<{ cnt: number }>(
      `SELECT COUNT(*)::int AS cnt
       FROM inquiry
       WHERE deleted_at IS NULL
         AND type = 'booking'
         AND preferred_date = $1
         AND preferred_time = $2
         AND status IN ('new', 'confirmed')`,
      [date, time]
    )
    return result.rows[0]?.cnt ?? 0
  } finally {
    await client.end()
  }
}
