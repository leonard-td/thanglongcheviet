import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Older DBs still have the nested navigation schema
 * (name/index/navigation_id). Storefront + seed expect the flat
 * NavigationItem shape (label/order/is_active/openInNewTab).
 * Tables are empty in typical local stacks — recreate safely.
 */
export class Migration20260722143000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`drop table if exists "navigation_item" cascade;`)
    this.addSql(`drop table if exists "navigation" cascade;`)
    this.addSql(`
      create table if not exists "navigation_item" (
        "id" text not null,
        "label" text not null,
        "url" text not null,
        "order" integer not null default 0,
        "openInNewTab" boolean not null default false,
        "parent_id" text null,
        "is_active" boolean not null default true,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "navigation_item_pkey" primary key ("id")
      );
    `)
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_navigation_item_deleted_at"
      ON "navigation_item" ("deleted_at") WHERE deleted_at IS NULL;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "navigation_item" cascade;`)
  }
}
