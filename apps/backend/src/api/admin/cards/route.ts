import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { zodValidator } from "../../utils/zod-validator"
import { CARD_MODULE } from "../../../modules/card"
import type CardModuleService from "../../../modules/card/service"
import { CAMPAIGN_MODULE } from "../../../modules/campaign"
import type CampaignModuleService from "../../../modules/campaign/service"
import { toRelativeMediaUrl } from "../../utils/media-url"
import { resolveCardPaths } from "../../utils/resolve-card-path"

const CreateCardSchema = z.object({
  title: z.record(z.string(), z.string()).default({}),
  image: z.string().nullable().optional(),
  path: z.string().nullable().optional(),
  topic_id: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cardModuleService: CardModuleService = req.scope.resolve(CARD_MODULE)
  const campaignModuleService: CampaignModuleService = req.scope.resolve(CAMPAIGN_MODULE)

  const [cards, count] = await cardModuleService.listAndCountCards(
    {},
    { order: { rank: "ASC" } }
  )

  res.json({ cards: await resolveCardPaths(cards, campaignModuleService), count })
}

/**
 * POST /admin/cards
 *
 * Always creates a plain type="link" card, never locked — the 3 special
 * widget-backed cards (contact/map/promotions) are seeded once and can't be
 * recreated through this endpoint.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const cardModuleService: CardModuleService = req.scope.resolve(CARD_MODULE)

  const body = await zodValidator(CreateCardSchema, req.body)

  const [lastCard] = await cardModuleService.listCards(
    {},
    { order: { rank: "DESC" }, take: 1 }
  )
  const highestRank = lastCard?.rank ?? -1

  const card = await cardModuleService.createCards({
    type: "link",
    title: body.title,
    image: toRelativeMediaUrl(body.image),
    path: body.path ?? null,
    topic_id: body.topic_id ?? null,
    is_active: body.is_active,
    locked: false,
    rank: highestRank + 1,
  })

  res.status(201).json({ card })
}
