import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { NAVIGATION_MODULE } from "../../../modules/navigation"
import {
  getCachedAsync,
  setCached,
  setPublicCacheHeaders,
  STORE_CACHE_TTL,
} from "../../../lib/store-cache"
import { toNavigationTree } from "../../../lib/store-dto"

const CACHE_KEY = "store:navigations"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const cached = await getCachedAsync<{ navigations: unknown[] }>(CACHE_KEY)
  if (cached) {
    setPublicCacheHeaders(res, 60)
    res.json(cached)
    return
  }

  const navigationModuleService = req.scope.resolve(NAVIGATION_MODULE)

  const items = await navigationModuleService.listNavigationItems(
    { is_active: true },
    { take: 100, order: { order: "ASC" } },
  )

  const map = new Map<string, Record<string, unknown>>()
  const roots: Array<Record<string, unknown>> = []

  items.forEach((item) => {
    map.set(item.id, { ...item, children: [] as unknown[] })
  })

  items.forEach((item) => {
    const node = map.get(item.id)!
    if (item.parent_id && map.has(item.parent_id)) {
      ;(map.get(item.parent_id)!.children as unknown[]).push(node)
    } else {
      roots.push(node)
    }
  })

  const payload = { navigations: toNavigationTree(roots) }
  setCached(CACHE_KEY, payload, STORE_CACHE_TTL.navigations)
  setPublicCacheHeaders(res, 60)
  res.json(payload)
}
