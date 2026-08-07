import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260805100000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `alter table "campaign_topic" add column if not exists "content_type" text check ("content_type" in ('post', 'product', 'event')) not null default 'post';`
    )
  }

  async down(): Promise<void> {
    this.addSql(`alter table "campaign_topic" drop column if exists "content_type";`)
  }
}
