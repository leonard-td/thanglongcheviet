import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { NAVIGATION_MODULE } from "../../../modules/navigation"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const navigationModuleService = req.scope.resolve(NAVIGATION_MODULE)
  
  // Fetch all active items
  const items = await navigationModuleService.listNavigationItems(
    { is_active: true }, 
    { take: 1000, order: { order: "ASC" } }
  )

  // Build nested tree
  const map = new Map<string, any>()
  const roots: any[] = []

  items.forEach(item => {
    map.set(item.id, { ...item, children: [] })
  })

  items.forEach(item => {
    const node = map.get(item.id)
    if (item.parent_id && map.has(item.parent_id)) {
      map.get(item.parent_id).children.push(node)
    } else {
      roots.push(node)
    }
  })

  res.json({ navigations: roots })
}
