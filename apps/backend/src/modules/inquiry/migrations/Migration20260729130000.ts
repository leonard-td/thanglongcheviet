import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260729130000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`alter table "inquiry" add column if not exists "normalized_phone" text null;`)
    this.addSql(`alter table "inquiry" add column if not exists "normalized_email" text null;`)
    this.addSql(
      `update "inquiry"
       set "normalized_phone" = right(regexp_replace(coalesce("phone", ''), '\\D', '', 'g'), 9),
           "normalized_email" = lower(nullif(trim(coalesce("email", '')), ''))
       where "normalized_phone" is null or "normalized_email" is null;`
    )
    this.addSql(
      `create index if not exists "IDX_inquiry_booking_phone"
       on "inquiry" ("normalized_phone", "created_at" desc)
       where "deleted_at" is null and "type" = 'booking';`
    )
    this.addSql(
      `create index if not exists "IDX_inquiry_booking_email"
       on "inquiry" ("normalized_email", "created_at" desc)
       where "deleted_at" is null and "type" = 'booking';`
    )
  }

  async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_inquiry_booking_phone";`)
    this.addSql(`drop index if exists "IDX_inquiry_booking_email";`)
    this.addSql(`alter table "inquiry" drop column if exists "normalized_phone";`)
    this.addSql(`alter table "inquiry" drop column if exists "normalized_email";`)
  }
}
