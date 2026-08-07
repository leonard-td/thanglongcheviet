import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260803090000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `alter table "site_setting" add column if not exists "home_video_url" text null;`
    )
  }

  async down(): Promise<void> {
    this.addSql(`alter table "site_setting" drop column if exists "home_video_url";`)
  }
}
