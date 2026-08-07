// Shared between the admin dashboard (Vite bundle, src/admin/**) and the
// server (Node, src/api/**) — both need to resolve a campaign_topic to its
// public storefront listing-page path, so this lives outside either tree.
export type CampaignTopicContentType = "post" | "product" | "event"

// Single source of truth for a topic's public storefront listing-page prefix.
// Keep in sync with apps/web/pages/{tin-tuc,san-pham,trai-nghiem}/chu-de/[slug].vue.
const TOPIC_PATH_PREFIX: Record<CampaignTopicContentType, string> = {
  post: "/tin-tuc/chu-de",
  product: "/san-pham/chu-de",
  event: "/trai-nghiem/chu-de",
}

export function topicPath(topic: { content_type: CampaignTopicContentType, slug: string }) {
  return `${TOPIC_PATH_PREFIX[topic.content_type]}/${topic.slug}`
}
