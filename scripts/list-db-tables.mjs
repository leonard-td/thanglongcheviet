import pg from "pg"

const client = new pg.Client({
  connectionString:
    process.env.DATABASE_URL ||
    "postgres://postgres:postgres@127.0.0.1:5432/medusa",
})

await client.connect()
const res = await client.query(`
  SELECT tablename
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename
`)
console.log(`Total: ${res.rows.length} tables\n`)
for (const row of res.rows) {
  console.log(row.tablename)
}
await client.end()
