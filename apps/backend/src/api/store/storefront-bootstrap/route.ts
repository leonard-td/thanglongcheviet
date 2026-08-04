import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { NAVIGATION_MODULE } from "../../../modules/navigation"
import { SITE_SETTINGS_MODULE } from "../../../modules/site-settings"
import type SiteSettingsModuleService from "../../../modules/site-settings/service"
import {
  getCachedAsync,
  setCached,
  setPublicCacheHeaders,
  STORE_CACHE_TTL,
} from "../../../lib/store-cache"
import { toNavigationTree, toStoreSiteSettings } from "../../../lib/store-dto"

const CACHE_KEY = "store:bootstrap"

function buildNavigationTree(
  items: Array<{
    id: string
    label: string
    url: string
    order: number
    openInNewTab?: boolean
    parent_id?: string | null
  }>,
) {
  const map = new Map<string, Record<string, unknown>>()
  const roots: Array<Record<string, unknown>> = []

  for (const item of items) {
    map.set(item.id, { ...item, children: [] as unknown[] })
  }

  for (const item of items) {
    const node = map.get(item.id)!
    if (item.parent_id && map.has(item.parent_id)) {
      ;(map.get(item.parent_id)!.children as unknown[]).push(node)
    } else {
      roots.push(node)
    }
  }

  return toNavigationTree(roots)
}

/**
 * GET /store/storefront-bootstrap
 *
 * One round-trip for SSR: site settings + navigation menu (cached).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cached = await getCachedAsync<{ site_settings: unknown; navigations: unknown[] }>(CACHE_KEY)
  if (cached) {
    setPublicCacheHeaders(res, 60)
    res.json(cached)
    return
  }

  const navigationService = req.scope.resolve(NAVIGATION_MODULE)
  const siteSettingsService: SiteSettingsModuleService =
    req.scope.resolve(SITE_SETTINGS_MODULE)

  const [items, settings] = await Promise.all([
    navigationService.listNavigationItems(
      { is_active: true },
      { take: 100, order: { order: "ASC" } },
    ),
    siteSettingsService.getSingleton(),
  ])

  const payload = {
    site_settings: toStoreSiteSettings(settings as Record<string, unknown>),
    navigations: buildNavigationTree(items),
  }

  setCached(CACHE_KEY, payload, STORE_CACHE_TTL.bootstrap)
  setPublicCacheHeaders(res, 60)
  res.json(payload)
}
