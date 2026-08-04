import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260729134000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `update "campaign_post" post
       set "topic_id" = null, "updated_at" = now()
       where "topic_id" is not null
         and not exists (
           select 1 from "campaign_topic" topic where topic.id = post.topic_id
         );`
    )
    this.addSql(
      `alter table "campaign_post"
       add constraint "FK_campaign_post_topic"
       foreign key ("topic_id") references "campaign_topic" ("id")
       on delete set null;`
    )
  }

  async down(): Promise<void> {
    this.addSql(
      `alter table "campaign_post"
       drop constraint if exists "FK_campaign_post_topic";`
    )
  }
}
