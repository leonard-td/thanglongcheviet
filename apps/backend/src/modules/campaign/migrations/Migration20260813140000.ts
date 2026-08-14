import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260813140000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `alter table "campaign_post" add column if not exists "translations" jsonb null;`
    )
    this.addSql(
      `update "campaign_post"
       set "translations" = jsonb_build_object(
         'vi',
         jsonb_strip_nulls(jsonb_build_object(
           'title', "title",
           'content', "content",
           'description', "description",
           'source', "source",
           'seo_title', "seo_title",
           'seo_description', "seo_description",
           'seo_keywords', "seo_keywords"
         ))
       )
       where "translations" is null;`
    )
  }

  async down(): Promise<void> {
    this.addSql(`alter table "campaign_post" drop column if exists "translations";`)
  }
}
