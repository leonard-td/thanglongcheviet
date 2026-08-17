import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260812000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      alter table "navigation_item"
      add column if not exists "thumbnail" text null;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "navigation_item" drop column if exists "thumbnail";`)
  }
}
