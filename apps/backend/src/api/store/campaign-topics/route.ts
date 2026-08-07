import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CAMPAIGN_MODULE } from "../../../modules/campaign"
import type CampaignModuleService from "../../../modules/campaign/service"

/**
 * GET /store/campaign-topics?content_type=post|product|event
 *
 * Returns active topics ordered by rank then name, each with the number of
 * currently visible posts (post_count — only meaningful for content_type
 * "post"; product/event listing pages compute their own item counts
 * client-side instead of relying on this field).
 *
 * Optional content_type filters to only topics grouping that entity type —
 * used by each type-specific "browse topics" sidebar so a post topic never
 * leaks into the product/event topic list or vice versa.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const campaignModuleService: CampaignModuleService =
    req.scope.resolve(CAMPAIGN_MODULE)

  const contentType =
    typeof req.query.content_type === "string" ? req.query.content_type : undefined

  const topics = await campaignModuleService.listCampaignTopics(
    contentType ? { is_active: true, content_type: contentType } : { is_active: true },
    { order: { rank: "ASC", name: "ASC" } }
  )

  const activePosts = await campaignModuleService.listActiveCampaignPosts(
    {},
    { select: ["id", "topic_id"] }
  )

  const countByTopic = new Map<string, number>()
  for (const post of activePosts) {
    if (post.topic_id) {
      countByTopic.set(post.topic_id, (countByTopic.get(post.topic_id) ?? 0) + 1)
    }
  }

  res.json({
    campaign_topics: topics.map((topic) => ({
      ...topic,
      post_count: countByTopic.get(topic.id) ?? 0,
    })),
  })
}
