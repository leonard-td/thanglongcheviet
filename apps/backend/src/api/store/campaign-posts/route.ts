import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CAMPAIGN_MODULE } from "../../../modules/campaign"
import type CampaignModuleService from "../../../modules/campaign/service"
import { parsePagination } from "../../utils/pagination"

/**
 * GET /store/campaign-posts
 *
 * Returns campaign posts that pass the auto-publish visibility filter:
 * is_active=true AND publish_at<=now AND (unpublish_at IS NULL OR unpublish_at>=now)
 *
 * Optional query params:
 * - topic_id: only posts belonging to this topic
 * - topic_slug: same, resolved by topic slug
 *
 * Each post is returned with its topic ({id, name, slug} or null).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const campaignModuleService: CampaignModuleService =
    req.scope.resolve(CAMPAIGN_MODULE)

  const { limit, offset } = parsePagination(req.query, {
    limit: 20,
    max: 100,
  })

  const filters: { topic_id?: string } = {}

  const topicSlug =
    typeof req.query.topic_slug === "string" ? req.query.topic_slug : ""
  const topicId =
    typeof req.query.topic_id === "string" ? req.query.topic_id : ""

  if (topicId) {
    filters.topic_id = topicId
  } else if (topicSlug) {
    const topics = await campaignModuleService.listCampaignTopics(
      { slug: topicSlug, is_active: true },
      { take: 1 }
    )
    if (!topics.length) {
      res.json({ campaign_posts: [], count: 0, limit, offset })
      return
    }
    filters.topic_id = topics[0].id
  }

  const [posts, count] =
    await campaignModuleService.listAndCountActiveCampaignPosts(filters, {
      take: limit,
      skip: offset,
      order: { publish_at: "DESC" },
    })

  const topicIds = [...new Set(posts.map((p) => p.topic_id).filter(Boolean))]
  const topics = topicIds.length
    ? await campaignModuleService.listCampaignTopics({
        id: topicIds as string[],
      })
    : []
  const topicById = new Map(
    topics.map((t) => [t.id, { id: t.id, name: t.name, slug: t.slug }])
  )

  res.json({
    campaign_posts: posts.map((post) => ({
      ...post,
      topic: post.topic_id ? (topicById.get(post.topic_id) ?? null) : null,
    })),
    count,
    limit,
    offset,
  })
}
