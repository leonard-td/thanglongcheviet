import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CARD_MODULE } from "../../../modules/card"
import type CardModuleService from "../../../modules/card/service"
import {
  getCachedAsync,
  setCached,
  setPublicCacheHeaders,
  STORE_CACHE_TTL,
} from "../../../lib/store-cache"

const CACHE_KEY = "store:cards"

/**
 * GET /store/cards
 *
 * Homepage pillar/card list, active only, ordered for display.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cached = await getCachedAsync<{ cards: unknown[] }>(CACHE_KEY)
  if (cached) {
    setPublicCacheHeaders(res, 300)
    res.json(cached)
    return
  }

  const cardModuleService: CardModuleService = req.scope.resolve(CARD_MODULE)
  const cards = await cardModuleService.listActiveCardsOrdered()
  const payload = { cards }

  setCached(CACHE_KEY, payload, STORE_CACHE_TTL.cards)
  setPublicCacheHeaders(res, 300)
  res.json(payload)
}
