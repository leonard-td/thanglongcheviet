import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/** Dedupe inbound webhook messages at the DB layer (Redis is the fast path). */
export class Migration20260722200000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_care_message_channel_external_id"
       ON "care_message" ("channel_id", "external_message_id")
       WHERE deleted_at IS NULL AND external_message_id IS NOT NULL;`,
    )
  }

  async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_care_message_channel_external_id";`)
  }
}
