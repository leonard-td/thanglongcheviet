import { connectDb } from "./backup/db"

/** Booking counts for one date grouped by preferred_time. */
export async function countBookingsByDate(date: string): Promise<Map<string, number>> {
  const client = await connectDb()
  try {
    const res = await client.query<{ preferred_time: string; cnt: string }>(
      `SELECT preferred_time, COUNT(*)::text AS cnt
       FROM inquiry
       WHERE deleted_at IS NULL
         AND type = 'booking'
         AND preferred_date = $1
         AND preferred_time IS NOT NULL
         AND status IN ('new', 'confirmed')
       GROUP BY preferred_time`,
      [date],
    )
    const map = new Map<string, number>()
    for (const row of res.rows) {
      map.set(row.preferred_time, Number(row.cnt) || 0)
    }
    return map
  } finally {
    await client.end()
  }
}

/** Count active campaign posts grouped by topic_id (one query). */
export async function countActivePostsByTopic(): Promise<Map<string, number>> {
  const client = await connectDb()
  try {
    const res = await client.query<{ topic_id: string; cnt: string }>(
      `SELECT topic_id, COUNT(*)::text AS cnt
       FROM campaign_post
       WHERE deleted_at IS NULL
         AND is_active = true
         AND topic_id IS NOT NULL
         AND (publish_at IS NULL OR publish_at <= NOW())
         AND (unpublish_at IS NULL OR unpublish_at >= NOW())
       GROUP BY topic_id`,
    )
    const map = new Map<string, number>()
    for (const row of res.rows) {
      map.set(row.topic_id, Number(row.cnt) || 0)
    }
    return map
  } finally {
    await client.end()
  }
}

/** Sum registered seats per event (non-cancelled). */
export async function sumRegisteredSeatsByEvent(
  eventIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (!eventIds.length) return map

  const client = await connectDb()
  try {
    const res = await client.query<{ event_id: string; seats: string }>(
      `SELECT event_id, COALESCE(SUM(quantity), 0)::text AS seats
       FROM event_registration
       WHERE deleted_at IS NULL
         AND status <> 'cancelled'
         AND event_id = ANY($1::text[])
       GROUP BY event_id`,
      [eventIds],
    )
    for (const row of res.rows) {
      map.set(row.event_id, Number(row.seats) || 0)
    }
    return map
  } finally {
    await client.end()
  }
}

/** Booking count for a single date+time slot (non-cancelled). */
export async function countBookingsForSlot(
  date: string,
  time: string,
): Promise<number> {
  const client = await connectDb()
  try {
    const res = await client.query<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt
       FROM inquiry
       WHERE deleted_at IS NULL
         AND type = 'booking'
         AND preferred_date = $1
         AND preferred_time = $2
         AND status IN ('new', 'confirmed')`,
      [date, time],
    )
    return Number(res.rows[0]?.cnt) || 0
  } finally {
    await client.end()
  }
}

function slotLockKey(date: string, time: string): number {
  const raw = `${date}:${time}`
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 31 + raw.charCodeAt(i)) | 0
  }
  return Math.abs(hash) || 1
}

/**
 * Serialize booking creates for the same slot so capacity checks stay accurate.
 */
export async function withBookingSlotLock<T>(
  date: string,
  time: string,
  fn: () => Promise<T>,
): Promise<T> {
  const client = await connectDb()
  const key = slotLockKey(date, time)
  try {
    await client.query("SELECT pg_advisory_lock($1)", [key])
    return await fn()
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [key]).catch(() => {})
    await client.end()
  }
}

/** Available units per variant (stocked − reserved across locations). */
export async function getVariantAvailableQuantities(
  variantIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (!variantIds.length) return map

  const client = await connectDb()
  try {
    const res = await client.query<{ variant_id: string; available: string }>(
      `SELECT pv.id AS variant_id,
              COALESCE(
                SUM(GREATEST(il.stocked_quantity - il.reserved_quantity, 0)),
                0
              )::text AS available
       FROM product_variant pv
       LEFT JOIN product_variant_inventory_item pvii
         ON pvii.variant_id = pv.id AND pvii.deleted_at IS NULL
       LEFT JOIN inventory_level il
         ON il.inventory_item_id = pvii.inventory_item_id AND il.deleted_at IS NULL
       WHERE pv.deleted_at IS NULL
         AND pv.id = ANY($1::text[])
       GROUP BY pv.id`,
      [variantIds],
    )
    for (const row of res.rows) {
      map.set(row.variant_id, Number(row.available) || 0)
    }
    return map
  } finally {
    await client.end()
  }
}
