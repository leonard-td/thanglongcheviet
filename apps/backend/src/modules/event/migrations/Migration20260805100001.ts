import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260805100001 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `alter table "event" add column if not exists "topic_id" text null;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_event_topic_id" ON "event" ("topic_id") WHERE deleted_at IS NULL;`
    )
  }

  async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_event_topic_id";`)
    this.addSql(`alter table "event" drop column if exists "topic_id";`)
  }
}
