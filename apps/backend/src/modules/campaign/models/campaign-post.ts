import { model } from "@medusajs/framework/utils"

const CampaignPost = model.define("campaign_post", {
  id: model.id({ prefix: "post" }).primaryKey(),
  title: model.text(),
  slug: model.text().searchable(),
  content: model.json(),
  // Short summary shown on listing cards/sidebar on the storefront and used
  // as the SEO meta description fallback — replaces the old behavior of
  // auto-truncating the content body
  description: model.text().nullable(),
  // Card/hero image; falls back to the first image inside content on the storefront
  thumbnail: model.text().nullable(),
  // Plain-column reference to campaign_topic (resolved manually in API routes)
  topic_id: model.text().nullable(),
  is_active: model.boolean().default(true),
  publish_at: model.dateTime().nullable(),
  unpublish_at: model.dateTime().nullable(),
  // Original source/attribution of the article, e.g. "Theo VnExpress" — shown on the storefront post
  source: model.text().nullable(),
  // SEO overrides for the storefront <title>/<meta description> — fall back to title/excerpt when empty
  seo_title: model.text().nullable(),
  seo_description: model.text().nullable(),
  seo_keywords: model.text().nullable(),
})

export default CampaignPost
