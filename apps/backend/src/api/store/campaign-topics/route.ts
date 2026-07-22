import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CAMPAIGN_MODULE } from "../../../modules/campaign"
import type CampaignModuleService from "../../../modules/campaign/service"
import { countActivePostsByTopic } from "../../../lib/pg-query"
import {
  getCachedAsync,
  setCached,
  setPublicCacheHeaders,
  STORE_CACHE_TTL,
} from "../../../lib/store-cache"
import { toCampaignTopicListItem } from "../../../lib/store-dto"

/**
 * GET /store/campaign-topics
 *
 * Returns active topics ordered by rank then name, each with the number of
 * currently visible posts.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cached = await getCachedAsync<{ campaign_topics: unknown[] }>("store:campaign-topics")
  if (cached) {
    setPublicCacheHeaders(res, 60)
    res.json(cached)
    return
  }

  const campaignModuleService: CampaignModuleService =
    req.scope.resolve(CAMPAIGN_MODULE)

  const [topics, countByTopic] = await Promise.all([
    campaignModuleService.listCampaignTopics(
      { is_active: true },
      { order: { rank: "ASC", name: "ASC" } },
    ),
    countActivePostsByTopic(),
  ])

  const payload = {
    campaign_topics: topics.map((topic) =>
      toCampaignTopicListItem(
        topic as Record<string, unknown>,
        countByTopic.get(topic.id) ?? 0,
      ),
    ),
  }

  setCached("store:campaign-topics", payload, STORE_CACHE_TTL.campaignTopics)
  setPublicCacheHeaders(res, 60)
  res.json(payload)
}
