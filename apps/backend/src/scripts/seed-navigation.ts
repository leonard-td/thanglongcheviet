import type { ExecArgs } from "@medusajs/framework/types"
import { NAVIGATION_MODULE } from "../modules/navigation"
import type NavigationModuleService from "../modules/navigation/service"

const DEFAULT_MENU = {
  id: "navm_storefront_header",
  name: "Storefront Header",
  slug: "storefront-header",
}

const DEFAULT_TREE: Array<{
  label: string
  url: string
  children?: Array<{ label: string; url: string }>
}> = [
  { label: "Trang chủ", url: "/" },
  {
    label: "Sản phẩm",
    url: "/san-pham-list",
    children: [
      { label: "Trà Việt", url: "/san-pham-list" },
      { label: "An Quang Caffé", url: "/an-quang-caffe" },
      { label: "Quà tặng doanh nghiệp", url: "/qua-tang-doanh-nghiep" },
    ],
  },
  { label: "Dự án & Đối tác", url: "/du-an-doi-tac" },
  { label: "Sự kiện", url: "/trai-nghiem" },
  {
    label: "Tin tức",
    url: "/tin-tuc",
    children: [
      { label: "Nếp Trà Việt", url: "/nep-tra-viet" },
      { label: "Văn hoá Việt", url: "/van-hoa-viet" },
      { label: "Di sản trà cũ", url: "/di-san-tra-cu" },
      { label: "Vườn An Quang", url: "/vuon-an-quang" },
    ],
  },
  { label: "Thư viện văn hóa", url: "/thu-vien-van-hoa" },
  { label: "Liên hệ", url: "/lien-he" },
]

export default async function seedNavigation({ container }: ExecArgs) {
  const service: NavigationModuleService = container.resolve(NAVIGATION_MODULE)

  let [menus] = await service.listAndCountNavigationMenus(
    { slug: DEFAULT_MENU.slug },
    { take: 1 }
  )

  let menu = menus[0]

  if (!menu) {
    menu = await service.createNavigationMenus({
      id: DEFAULT_MENU.id,
      name: DEFAULT_MENU.name,
      slug: DEFAULT_MENU.slug,
      is_active: false,
    })
    console.log(`Created menu "${menu.slug}" (${menu.id}).`)
  } else {
    console.log(`Menu "${menu.slug}" already exists (${menu.id}).`)
  }

  await service.setActiveMenu(menu.id)

  const existingItems = await service.listItemsByMenu(menu.id)
  if (existingItems.length > 0) {
    console.log(
      `Menu already has ${existingItems.length} items — skipping item seed.`
    )
    console.log(`Active menu id: ${menu.id}`)
    return
  }

  for (let order = 0; order < DEFAULT_TREE.length; order++) {
    const node = DEFAULT_TREE[order]
    const root = await service.createNavigationItems({
      menu_id: menu.id,
      label: node.label,
      url: node.url,
      order,
      parent_id: null,
      is_active: true,
      openInNewTab: false,
    })

    for (let childOrder = 0; childOrder < (node.children?.length || 0); childOrder++) {
      const child = node.children![childOrder]
      await service.createNavigationItems({
        menu_id: menu.id,
        label: child.label,
        url: child.url,
        order: childOrder,
        parent_id: root.id,
        is_active: true,
        openInNewTab: false,
      })
    }
  }

  console.log(`Seeded ${DEFAULT_TREE.length} root items into "${menu.slug}".`)
  console.log(`Active menu id: ${menu.id}`)
}
