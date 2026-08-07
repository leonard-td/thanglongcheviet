import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260803120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "navigation_menu" (
        "id" text not null,
        "name" text not null,
        "slug" text not null,
        "is_active" boolean not null default false,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "navigation_menu_pkey" primary key ("id")
      );
    `)
    this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_navigation_menu_slug_unique"
      ON "navigation_menu" ("slug") WHERE deleted_at IS NULL;
    `)
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_navigation_menu_deleted_at"
      ON "navigation_menu" ("deleted_at") WHERE deleted_at IS NULL;
    `)

    // Deterministic default menu for backfill + storefront.
    this.addSql(`
      insert into "navigation_menu" ("id", "name", "slug", "is_active")
      select 'navm_storefront_header', 'Storefront Header', 'storefront-header', true
      where not exists (
        select 1 from "navigation_menu" where "id" = 'navm_storefront_header' and "deleted_at" is null
      );
    `)

    this.addSql(`
      alter table "navigation_item"
      add column if not exists "menu_id" text null;
    `)

    this.addSql(`
      update "navigation_item"
      set "menu_id" = 'navm_storefront_header'
      where "menu_id" is null and "deleted_at" is null;
    `)

    // Soft-deleted rows without menu_id still need a value before NOT NULL.
    this.addSql(`
      update "navigation_item"
      set "menu_id" = 'navm_storefront_header'
      where "menu_id" is null;
    `)

    this.addSql(`
      alter table "navigation_item"
      alter column "menu_id" set not null;
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_navigation_item_menu_id"
      ON "navigation_item" ("menu_id") WHERE deleted_at IS NULL;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_navigation_item_menu_id";`)
    this.addSql(`alter table "navigation_item" drop column if exists "menu_id";`)
    this.addSql(`drop table if exists "navigation_menu" cascade;`)
  }
}
