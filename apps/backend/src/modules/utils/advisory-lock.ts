import type { Context } from "@medusajs/framework/types"

type DbManager = {
  getTransactionContext?: () => unknown
  getConnection: () => {
    execute: (
      sql: string,
      params: unknown[],
      method?: string,
      ctx?: unknown
    ) => Promise<unknown>
  }
}

/**
 * Serialize concurrent writers for the same logical resource inside the
 * current DB transaction. Lock is released automatically on commit/rollback.
 */
export async function acquireAdvisoryXactLock(
  sharedContext: Context,
  lockKey: string
): Promise<void> {
  const manager = (sharedContext.transactionManager ??
    sharedContext.manager) as DbManager | undefined
  if (!manager) {
    throw new Error("Database manager not available for advisory lock")
  }

  const ctx =
    typeof manager.getTransactionContext === "function"
      ? manager.getTransactionContext()
      : undefined

  await manager.getConnection().execute(
    "SELECT pg_advisory_xact_lock(hashtext(?))",
    [lockKey],
    "all",
    ctx
  )
}
