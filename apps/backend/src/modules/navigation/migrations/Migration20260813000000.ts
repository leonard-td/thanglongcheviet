import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260813000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      alter table "navigation_item"
      add column if not exists "icon" text null;
    `)
    this.addSql(`
      alter table "navigation_item"
      add column if not exists "display_mode" text check ("display_mode" in ('none', 'icon', 'image')) not null default 'none';
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "navigation_item" drop column if exists "display_mode";`)
    this.addSql(`alter table "navigation_item" drop column if exists "icon";`)
  }
}
