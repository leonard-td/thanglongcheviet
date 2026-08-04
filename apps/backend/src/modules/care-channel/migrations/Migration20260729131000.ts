import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260729131000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`alter table "care_message" add column if not exists "reference_id" text null;`)
    this.addSql(
      `delete from "care_message" duplicate
       using "care_message" keep
       where duplicate.id > keep.id
         and duplicate.channel_id = keep.channel_id
         and duplicate.direction = 'inbound'
         and keep.direction = 'inbound'
         and duplicate.external_message_id = keep.external_message_id
         and duplicate.external_message_id is not null
         and duplicate.deleted_at is null
         and keep.deleted_at is null;`
    )
    this.addSql(
      `create unique index if not exists "UQ_care_message_inbound_external"
       on "care_message" ("channel_id", "external_message_id")
       where "deleted_at" is null
         and "direction" = 'inbound'
         and "external_message_id" is not null;`
    )
    this.addSql(
      `create unique index if not exists "UQ_care_message_outbound_reference"
       on "care_message" ("channel_id", "external_user_id", "reference_id")
       where "deleted_at" is null
         and "direction" = 'outbound'
         and "reference_id" is not null;`
    )
    this.addSql(
      `delete from "care_message"
       where "channel_id" not in (
         select "id" from "care_channel" where "deleted_at" is null
       );`
    )
    this.addSql(
      `alter table "care_message"
       add constraint "FK_care_message_channel"
       foreign key ("channel_id") references "care_channel" ("id")
       on delete cascade;`
    )
  }

  async down(): Promise<void> {
    this.addSql(`alter table "care_message" drop constraint if exists "FK_care_message_channel";`)
    this.addSql(`drop index if exists "UQ_care_message_inbound_external";`)
    this.addSql(`drop index if exists "UQ_care_message_outbound_reference";`)
    this.addSql(`alter table "care_message" drop column if exists "reference_id";`)
  }
}
