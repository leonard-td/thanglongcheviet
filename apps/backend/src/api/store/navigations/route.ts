import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { NAVIGATION_MODULE } from "../../../modules/navigation"
import type NavigationModuleService from "../../../modules/navigation/service"
import {
  getCachedAsync,
  setCached,
  setPublicCacheHeaders,
  STORE_CACHE_TTL,
} from "../../../lib/store-cache"

const CACHE_KEY = "store:navigations:active"

/**
 * GET /store/navigations — tree of the currently active menu template.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cached = await getCachedAsync<{
    menu: { id: string; name: string; slug: string } | null
    navigations: unknown[]
  }>(CACHE_KEY)
  if (cached) {
    setPublicCacheHeaders(res, 60)
    res.json(cached)
    return
  }

  const service: NavigationModuleService = req.scope.resolve(NAVIGATION_MODULE)

  const active = await service.getActiveMenu()
  if (!active) {
    const payload = { menu: null, navigations: [] }
    setCached(CACHE_KEY, payload, STORE_CACHE_TTL.navigations)
    setPublicCacheHeaders(res, 60)
    res.json(payload)
    return
  }

  const tree = await service.getMenuTree(active.id, { activeOnly: true })
  const payload = {
    menu: { id: active.id, name: active.name, slug: active.slug },
    navigations: tree,
  }
  setCached(CACHE_KEY, payload, STORE_CACHE_TTL.navigations)
  setPublicCacheHeaders(res, 60)
  res.json(payload)
}
