import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260729140000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `update "navigation_item" child
       set "parent_id" = null, "updated_at" = now()
       where "parent_id" is not null
         and (
           "parent_id" = child.id
           or not exists (
             select 1 from "navigation_item" parent
             where parent.id = child.parent_id
           )
         );`
    )
    this.addSql(
      `alter table "navigation_item"
       add constraint "FK_navigation_item_parent"
       foreign key ("parent_id") references "navigation_item" ("id")
       on delete set null;`
    )
  }

  async down(): Promise<void> {
    this.addSql(
      `alter table "navigation_item"
       drop constraint if exists "FK_navigation_item_parent";`
    )
  }
}
