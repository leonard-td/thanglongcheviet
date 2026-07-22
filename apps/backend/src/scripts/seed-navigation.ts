import type { ExecArgs } from "@medusajs/framework/types"
import { NAVIGATION_MODULE } from "../modules/navigation"

/**
 * Seeds flat NavigationItem rows used by GET /store/navigations and the
 * Nuxt header. Idempotent: skips create when any active items already exist.
 */
const DEFAULT_ITEMS = [
  { label: "Giới thiệu", url: "/gioi-thieu", order: 0 },
  { label: "Sản phẩm", url: "/san-pham-list", order: 1 },
  { label: "Quà tặng doanh nghiệp", url: "/qua-tang-doanh-nghiep", order: 2 },
  { label: "Trải nghiệm", url: "/trai-nghiem", order: 3 },
  { label: "Tin tức", url: "/tin-tuc", order: 4 },
  { label: "Liên hệ", url: "/lien-he", order: 5 },
]

export default async function seedNavigation({ container }: ExecArgs) {
  const navigationService = container.resolve(NAVIGATION_MODULE) as {
    listNavigationItems: (
      filters?: Record<string, unknown>,
      config?: Record<string, unknown>,
    ) => Promise<{ id: string; label: string; url: string }[]>
    createNavigationItems: (
      data: Array<{
        label: string
        url: string
        order: number
        parent_id?: string | null
        is_active?: boolean
        openInNewTab?: boolean
      }>,
    ) => Promise<unknown>
  }

  const existing = await navigationService.listNavigationItems(
    { is_active: true },
    { take: 1 },
  )

  if (existing.length) {
    console.log(
      `Navigation already has ${existing.length}+ item(s); skipping seed.`,
    )
    return
  }

  await navigationService.createNavigationItems(
    DEFAULT_ITEMS.map((item) => ({
      ...item,
      parent_id: null,
      is_active: true,
      openInNewTab: false,
    })),
  )

  console.log(`Created ${DEFAULT_ITEMS.length} storefront navigation items.`)
}
