import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260729132000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `update "site_setting"
       set "deleted_at" = now(), "updated_at" = now()
       where "deleted_at" is null
         and "id" not in (
           select "id" from "site_setting"
           where "deleted_at" is null
           order by "created_at", "id"
           limit 1
         );`
    )
    this.addSql(
      `create unique index if not exists "UQ_site_setting_singleton"
       on "site_setting" ((true))
       where "deleted_at" is null;`
    )
  }

  async down(): Promise<void> {
    this.addSql(`drop index if exists "UQ_site_setting_singleton";`)
  }
}
