import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { NAVIGATION_MODULE } from "../../../modules/navigation"
import type NavigationModuleService from "../../../modules/navigation/service"
import { attachNavThumbnails } from "../../utils/nav-thumbnails"

type StoreNavNode = {
  id: string
  url: string
  thumbnail?: string | null
  resolved_thumbnail?: string | null
  link_type?: string | null
  resolved_path?: string | null
  children?: StoreNavNode[]
  [key: string]: unknown
}

/**
 * Collapses the admin's `thumbnail` (manual override) + `resolved_thumbnail`
 * (auto-matched from the URL, see nav-thumbnails.ts) into the single
 * `thumbnail` field the storefront actually renders — manual override wins.
 */
function withEffectiveThumbnail(nodes: StoreNavNode[]): StoreNavNode[] {
  return nodes.map((node) => ({
    ...node,
    thumbnail: node.thumbnail || node.resolved_thumbnail || null,
    resolved_thumbnail: undefined,
    children: node.children ? withEffectiveThumbnail(node.children) : undefined,
  }))
}

/**
 * GET /store/navigations — tree of the currently active menu template.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: NavigationModuleService = req.scope.resolve(NAVIGATION_MODULE)

  const active = await service.getActiveMenu()
  if (!active) {
    return res.json({ menu: null, navigations: [] })
  }

  const tree = withEffectiveThumbnail(
    await attachNavThumbnails(
      req.scope,
      await service.getMenuTree(active.id, { activeOnly: true })
    )
  )
  res.json({
    menu: { id: active.id, name: active.name, slug: active.slug },
    navigations: tree,
  })
}
