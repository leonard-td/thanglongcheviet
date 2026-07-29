import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260729135000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `update "card_media" media
       set "folder_id" = null, "updated_at" = now()
       where "folder_id" is not null
         and not exists (
           select 1 from "media_folder" folder where folder.id = media.folder_id
         );`
    )
    this.addSql(
      `alter table "card_media"
       add constraint "FK_card_media_folder"
       foreign key ("folder_id") references "media_folder" ("id")
       on delete set null;`
    )
  }

  async down(): Promise<void> {
    this.addSql(
      `alter table "card_media"
       drop constraint if exists "FK_card_media_folder";`
    )
  }
}
