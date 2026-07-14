import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260713100000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `create table if not exists "site_setting" (
        "id" text not null,
        "store_name" text null,
        "email" text null,
        "phone" text null,
        "address" text null,
        "google_map_url" text null,
        "open_hours" text null,
        "facebook_url" text null,
        "zalo_url" text null,
        "instagram_url" text null,
        "hero_images" jsonb not null default '[]',
        "about_title" text null,
        "about_thumbnail" text null,
        "about_content" jsonb null,
        "about_collection_id" text null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "site_setting_pkey" primary key ("id")
      );`
    )
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "site_setting" cascade;`)
  }
}
