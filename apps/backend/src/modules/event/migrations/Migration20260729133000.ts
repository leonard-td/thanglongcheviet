import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260729133000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `delete from "event_registration"
       where "event_id" not in (select "id" from "event");`
    )
    this.addSql(
      `alter table "event_registration"
       add constraint "FK_event_registration_event"
       foreign key ("event_id") references "event" ("id")
       on delete cascade;`
    )
  }

  async down(): Promise<void> {
    this.addSql(
      `alter table "event_registration"
       drop constraint if exists "FK_event_registration_event";`
    )
  }
}
