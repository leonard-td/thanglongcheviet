import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260712090000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `alter table "campaign_post" add column if not exists "description" text null;`
    )
  }

  async down(): Promise<void> {
    this.addSql(`alter table "campaign_post" drop column if exists "description";`)
  }
}
