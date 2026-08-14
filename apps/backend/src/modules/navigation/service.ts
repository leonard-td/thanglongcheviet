import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import { NavigationItem } from "./models/navigation-item"
import { NavigationMenu } from "./models/navigation-menu"

export type NavigationItemRecord = {
  id: string
  menu_id: string
  label: string
  url: string
  order: number
  openInNewTab: boolean
  parent_id: string | null
  is_active: boolean
  thumbnail: string | null
  icon: string | null
  display_mode: "none" | "icon" | "image"
}

export type NavigationTreeNode = NavigationItemRecord & {
  children: NavigationTreeNode[]
}

/** Max tree depth for storefront header (root + one child level). */
export const MAX_NAV_DEPTH = 2

export function buildNavigationTree(
  items: NavigationItemRecord[]
): NavigationTreeNode[] {
  const map = new Map<string, NavigationTreeNode>()
  const roots: NavigationTreeNode[] = []

  for (const item of items) {
    map.set(item.id, { ...item, children: [] })
  }

  for (const item of items) {
    const node = map.get(item.id)!
    if (item.parent_id && map.has(item.parent_id)) {
      map.get(item.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  const sortRecursive = (nodes: NavigationTreeNode[]) => {
    nodes.sort((a, b) => (a.order || 0) - (b.order || 0))
    nodes.forEach((n) => sortRecursive(n.children))
  }
  sortRecursive(roots)

  return roots
}

class NavigationModuleService extends MedusaService({
  NavigationMenu,
  NavigationItem,
}) {
  /**
   * Activate one menu and deactivate all others.
   */
  async setActiveMenu(menuId: string) {
    const menu = await this.retrieveNavigationMenu(menuId)

    const [activeMenus] = await this.listAndCountNavigationMenus(
      { is_active: true },
      { take: 1000 }
    )

    for (const active of activeMenus) {
      if (active.id !== menu.id) {
        await this.updateNavigationMenus({
          id: active.id,
          is_active: false,
        })
      }
    }

    if (!menu.is_active) {
      await this.updateNavigationMenus({
        id: menu.id,
        is_active: true,
      })
    }

    return await this.retrieveNavigationMenu(menuId)
  }

  async getActiveMenu() {
    const [menus] = await this.listAndCountNavigationMenus(
      { is_active: true },
      { take: 1 }
    )
    return menus[0] ?? null
  }

  async listItemsByMenu(
    menuId: string,
    options?: { activeOnly?: boolean }
  ): Promise<NavigationItemRecord[]> {
    const filters: Record<string, unknown> = { menu_id: menuId }
    if (options?.activeOnly) {
      filters.is_active = true
    }

    const items = await this.listNavigationItems(filters, {
      take: 2000,
      order: { order: "ASC" },
    })

    return items as unknown as NavigationItemRecord[]
  }

  async getMenuTree(
    menuId: string,
    options?: { activeOnly?: boolean }
  ): Promise<NavigationTreeNode[]> {
    const items = await this.listItemsByMenu(menuId, options)
    return buildNavigationTree(items)
  }

  /**
   * Depth of a node: 1 = root, 2 = child. Throws if parent chain exceeds max.
   */
  async assertValidParent(
    menuId: string,
    parentId: string | null | undefined,
    itemId?: string
  ) {
    if (!parentId) {
      return
    }

    if (itemId && parentId === itemId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "An item cannot be its own parent"
      )
    }

    const parent = (await this.retrieveNavigationItem(
      parentId
    )) as unknown as NavigationItemRecord

    if (parent.menu_id !== menuId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Parent must belong to the same menu"
      )
    }

    if (parent.parent_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Navigation depth cannot exceed ${MAX_NAV_DEPTH} levels`
      )
    }

    if (itemId) {
      // Prevent making a parent of its own descendant (only 2 levels, so
      // check if item currently has children and parent would nest under it
      // — with max depth 2, an item with children can only be a root.
      const children = await this.listNavigationItems(
        { parent_id: itemId },
        { take: 1 }
      )
      // If we're assigning a parent, this item becomes depth 2 and must not
      // already have children (that would create depth 3).
      if (children.length > 0) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Navigation depth cannot exceed ${MAX_NAV_DEPTH} levels`
        )
      }
    }
  }

  async reorderItems(
    menuId: string,
    updates: Array<{ id: string; parent_id: string | null; order: number }>
  ) {
    await this.retrieveNavigationMenu(menuId)

    for (const update of updates) {
      const item = (await this.retrieveNavigationItem(
        update.id
      )) as unknown as NavigationItemRecord

      if (item.menu_id !== menuId) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Item ${update.id} does not belong to menu ${menuId}`
        )
      }

      await this.assertValidParent(menuId, update.parent_id, update.id)

      await this.updateNavigationItems({
        id: update.id,
        parent_id: update.parent_id,
        order: update.order,
      })
    }

    return await this.getMenuTree(menuId)
  }
}

export default NavigationModuleService
