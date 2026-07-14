import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260710150000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `create table if not exists "care_channel" (
        "id" text not null,
        "name" text not null,
        "provider" text check ("provider" in ('telegram', 'zalo_oa')) not null,
        "notify_orders" boolean not null default true,
        "receive_messages" boolean not null default true,
        "is_active" boolean not null default true,
        "config" jsonb not null default '{}',
        "webhook_secret" text null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "care_channel_pkey" primary key ("id")
      );`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_care_channel_provider" ON "care_channel" ("provider") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `create table if not exists "care_message" (
        "id" text not null,
        "channel_id" text not null,
        "direction" text check ("direction" in ('inbound', 'outbound')) not null,
        "kind" text check ("kind" in ('order', 'support', 'test')) not null default 'support',
        "external_user_id" text null,
        "external_user_name" text null,
        "external_message_id" text null,
        "content" text not null,
        "status" text check ("status" in ('sent', 'failed', 'received')) not null,
        "error" text null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "care_message_pkey" primary key ("id")
      );`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_care_message_channel_id" ON "care_message" ("channel_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_care_message_channel_user" ON "care_message" ("channel_id", "external_user_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_care_message_external_message_id" ON "care_message" ("external_message_id") WHERE deleted_at IS NULL;`
    )
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "care_message" cascade;`)
    this.addSql(`drop table if exists "care_channel" cascade;`)
  }
}
