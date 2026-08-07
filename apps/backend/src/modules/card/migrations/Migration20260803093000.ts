import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260803093000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `alter table "card" add column if not exists "topic_id" text null;`
    )
  }

  async down(): Promise<void> {
    this.addSql(`alter table "card" drop column if exists "topic_id";`)
  }
}
