import { model } from "@medusajs/framework/utils"

const Event = model.define("event", {
  id: model.id({ prefix: "evt" }).primaryKey(),
  title: model.text(),
  slug: model.text().searchable(),
  content: model.json(),
  // Card/hero image shown on the storefront event listing and detail pages
  thumbnail: model.text().nullable(),
  location: model.text().nullable(),
  start_at: model.dateTime().nullable(),
  end_at: model.dateTime().nullable(),
  // Max number of seats across all registrations; null = unlimited
  capacity: model.number().nullable(),
  // Master switch for accepting new registrations, independent of visibility
  registration_open: model.boolean().default(true),
  // Plain-column reference to campaign_topic (resolved manually in API routes)
  topic_id: model.text().nullable(),
  is_active: model.boolean().default(true),
  // SEO overrides for the storefront <title>/<meta description> — fall back to title/excerpt when empty
  seo_title: model.text().nullable(),
  seo_description: model.text().nullable(),
  seo_keywords: model.text().nullable(),
})

export default Event
