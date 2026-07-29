import type { Client } from "pg"
import { connectDb } from "./backup/db"

/**
 * Run a critical section under a PostgreSQL transaction-scoped advisory lock.
 * Every reservation/state-transition path uses the same resource key, making
 * check-and-write operations safe across processes and backend replicas.
 */
export async function withDatabaseLock<T>(
  resourceKey: string,
  operation: (client: Client) => Promise<T>
): Promise<T> {
  const client = await connectDb()

  try {
    await client.query("BEGIN")
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [resourceKey]
    )
    const result = await operation(client)
    await client.query("COMMIT")
    return result
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {})
    throw error
  } finally {
    await client.end()
  }
}
