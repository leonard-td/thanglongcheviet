import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CAMPAIGN_MODULE } from "../../../modules/campaign"
import type CampaignModuleService from "../../../modules/campaign/service"
import { toCampaignPostListItem } from "../../../lib/store-dto"

/**
 * GET /store/campaign-posts
 *
 * Returns campaign posts that pass the auto-publish visibility filter.
 * List responses omit heavy TipTap `content` — use GET /store/campaign-posts/:slug for full body.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const campaignModuleService: CampaignModuleService =
    req.scope.resolve(CAMPAIGN_MODULE)

  const limit = Math.min(Number(req.query.limit) || 20, 100)
  const offset = Number(req.query.offset) || 0

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
      { take: 1 },
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
      select: [
        "id",
        "title",
        "slug",
        "description",
        "thumbnail",
        "publish_at",
        "source",
        "topic_id",
      ],
    })

  const topicIds = [...new Set(posts.map((p) => p.topic_id).filter(Boolean))]
  const topics = topicIds.length
    ? await campaignModuleService.listCampaignTopics({
        id: topicIds as string[],
      })
    : []
  const topicById = new Map(
    topics.map((t) => [t.id, { id: t.id, name: t.name, slug: t.slug }]),
  )

  res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60")
  res.json({
    campaign_posts: posts.map((post) =>
      toCampaignPostListItem(
        post as Record<string, unknown>,
        post.topic_id ? (topicById.get(post.topic_id) ?? null) : null,
      ),
    ),
    count,
    limit,
    offset,
  })
}
