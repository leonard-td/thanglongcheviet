import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260824120000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `alter table "site_setting" add column if not exists "hotline" text null;`
    )
    this.addSql(
      `alter table "site_setting" add column if not exists "website_url" text null;`
    )
    this.addSql(
      `alter table "site_setting" add column if not exists "translations" jsonb null;`
    )
  }

  async down(): Promise<void> {
    this.addSql(`alter table "site_setting" drop column if exists "hotline";`)
    this.addSql(
      `alter table "site_setting" drop column if exists "website_url";`
    )
    this.addSql(
      `alter table "site_setting" drop column if exists "translations";`
    )
  }
}
