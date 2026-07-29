import type { ExecArgs } from "@medusajs/framework/types"
import { NAVIGATION_MODULE } from "../modules/navigation"
import type NavigationModuleService from "../modules/navigation/service"

const DEFAULT_ITEMS = [
  { label: "Trang chủ", url: "/", order: 0 },
  { label: "Cửa hàng", url: "/store", order: 1 },
  { label: "Bài viết", url: "/campaign-posts", order: 2 },
  { label: "Tài khoản", url: "/account", order: 3 },
  { label: "Giỏ hàng", url: "/cart", order: 4 },
]

export default async function seedNavigation({ container }: ExecArgs) {
  const navigationService: NavigationModuleService =
    container.resolve(NAVIGATION_MODULE)
  const existing = await navigationService.listNavigationItems(
    {},
    { take: 1 }
  )

  if (existing.length) {
    console.log("Navigation items already exist; preserving admin-managed menu.")
    return
  }

  for (const item of DEFAULT_ITEMS) {
    await navigationService.createNavigationItems({
      ...item,
      openInNewTab: false,
      parent_id: null,
      is_active: true,
    })
  }

  console.log(`Created ${DEFAULT_ITEMS.length} default navigation items.`)
}
