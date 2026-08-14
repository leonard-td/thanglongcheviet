import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { CAMPAIGN_MODULE } from "../../../../modules/campaign"
import type CampaignModuleService from "../../../../modules/campaign/service"
import {
  resolveCampaignPostTranslation,
  type CampaignPostLocale,
} from "../../../../modules/campaign/translations"

const requestedLocale = (value: unknown): CampaignPostLocale =>
  value === "en" ? "en" : "vi"

/**
 * GET /store/campaign-posts/:slug
 *
 * Returns a single active campaign post by slug, with its topic attached
 * ({id, name, slug} or null).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { slug } = req.params
  const locale = requestedLocale(req.query.lang)

  const campaignModuleService: CampaignModuleService =
    req.scope.resolve(CAMPAIGN_MODULE)

  const posts = await campaignModuleService.listActiveCampaignPosts(
    { slug },
    { take: 1 }
  )

  if (!posts.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Campaign post with slug "${slug}" was not found`
    )
  }

  const post = posts[0]
  let topic: { id: string, name: string, slug: string } | null = null

  if (post.topic_id) {
    const topics = await campaignModuleService.listCampaignTopics(
      { id: post.topic_id },
      { take: 1 }
    )
    if (topics.length) {
      topic = { id: topics[0].id, name: topics[0].name, slug: topics[0].slug }
    }
  }

  res.json({
    campaign_post: {
      ...post,
      ...resolveCampaignPostTranslation(post, locale),
      topic,
    },
  })
}
