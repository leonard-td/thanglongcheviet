import type { Context } from "@medusajs/framework/types"

type DbManager = {
  getTransactionContext?: () => KnexLike | undefined
  getKnex?: () => KnexLike
}

type KnexLike = {
  raw: (
    sql: string,
    bindings?: unknown[]
  ) => Promise<{ rows?: Array<Record<string, unknown>> }>
}

export function getTransactionKnex(sharedContext: Context): KnexLike {
  const manager = (sharedContext.transactionManager ??
    sharedContext.manager) as DbManager | undefined
  if (!manager) {
    throw new Error("Database manager not available")
  }

  const knex =
    typeof manager.getTransactionContext === "function"
      ? manager.getTransactionContext()
      : undefined

  if (!knex?.raw) {
    throw new Error("Active DB transaction required for slot locking")
  }

  return knex
}

/**
 * Serialize concurrent writers for the same logical resource inside the
 * current DB transaction. Lock is released automatically on commit/rollback.
 */
export async function acquireAdvisoryXactLock(
  sharedContext: Context,
  lockKey: string
): Promise<void> {
  const knex = getTransactionKnex(sharedContext)
  await knex.raw("SELECT pg_advisory_xact_lock(hashtext(?))", [lockKey])
}

/**
 * Count active bookings for one date/time inside the current transaction.
 */
export async function countActiveBookingsInTx(
  sharedContext: Context,
  preferredDate: string,
  preferredTime: string
): Promise<number> {
  const knex = getTransactionKnex(sharedContext)
  const result = await knex.raw(
    `SELECT COUNT(*)::int AS cnt
     FROM inquiry
     WHERE deleted_at IS NULL
       AND type = 'booking'
       AND preferred_date = ?
       AND preferred_time = ?
       AND status IN ('new', 'confirmed')`,
    [preferredDate, preferredTime]
  )
  return Number(result.rows?.[0]?.cnt ?? 0)
}
