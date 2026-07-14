import { Client } from "pg"

// Kết nối trực tiếp bằng pg (không qua MikroORM) — backup/restore cần COPY
// streaming và điều khiển transaction thô, những thứ ORM không expose.
export async function connectDb(): Promise<Client> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set")
  }
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  return client
}

export async function listTables(client: Client): Promise<string[]> {
  const res = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
  )
  return res.rows.map((r) => String(r.tablename))
}

// Bỏ cột GENERATED ALWAYS — COPY FROM không được phép ghi vào chúng, giá trị
// sẽ tự tính lại từ các cột nguồn khi nạp dữ liệu.
export async function listColumns(
  client: Client,
  table: string
): Promise<string[]> {
  const res = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND is_generated <> 'ALWAYS'
     ORDER BY ordinal_position`,
    [table]
  )
  return res.rows.map((r) => String(r.column_name))
}

export async function listSequences(
  client: Client
): Promise<{ name: string; last_value: string | null }[]> {
  const res = await client.query(
    `SELECT sequencename, last_value FROM pg_sequences
     WHERE schemaname = 'public' ORDER BY sequencename`
  )
  return res.rows.map((r) => ({
    name: String(r.sequencename),
    last_value: r.last_value === null ? null : String(r.last_value),
  }))
}

export async function listMigrations(client: Client): Promise<string[]> {
  const res = await client.query(
    `SELECT name FROM mikro_orm_migrations ORDER BY name`
  )
  return res.rows.map((r) => String(r.name))
}

export function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`
}
