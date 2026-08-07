import { model } from "@medusajs/framework/utils"

const CampaignTopic = model.define("campaign_topic", {
  id: model.id({ prefix: "ctopic" }).primaryKey(),
  name: model.text(),
  slug: model.text().searchable(),
  description: model.text().nullable(),
  // Banner/hero image shown on the storefront topic listing page
  image: model.text().nullable(),
  // Which entity this topic groups — controls the storefront listing page
  // prefix (post -> /tin-tuc/chu-de, product -> /san-pham/chu-de,
  // event -> /trai-nghiem/chu-de). Defaults to "post" since every topic
  // created before this field existed groups campaign_posts.
  content_type: model.enum(["post", "product", "event"]).default("post"),
  is_active: model.boolean().default(true),
  rank: model.number().default(0),
})

export default CampaignTopic
