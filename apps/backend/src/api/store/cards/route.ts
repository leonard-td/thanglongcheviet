import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CARD_MODULE } from "../../../modules/card"
import type CardModuleService from "../../../modules/card/service"
import { CAMPAIGN_MODULE } from "../../../modules/campaign"
import type CampaignModuleService from "../../../modules/campaign/service"
import { resolveCardPaths } from "../../utils/resolve-card-path"

/**
 * GET /store/cards
 *
 * Homepage pillar/card list, active only, ordered for display. Cards linked
 * to a topic (topic_id set) get their `path` re-resolved against that
 * topic's CURRENT slug/content_type here, so editing a topic later doesn't
 * leave the homepage tile pointing at a stale URL — see resolveCardPaths().
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cardModuleService: CardModuleService = req.scope.resolve(CARD_MODULE)
  const campaignModuleService: CampaignModuleService = req.scope.resolve(CAMPAIGN_MODULE)

  const cards = await cardModuleService.listActiveCardsOrdered()

  res.json({ cards: await resolveCardPaths(cards, campaignModuleService) })
}
