export type NavigationMenu = {
  id: string
  name: string
  slug: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export type NavLinkType =
  | "product"
  | "product_category"
  | "product_collection"
  | "product_topic"
  | "post"
  | "post_topic"
  | "event"
  | "event_topic"

export type NavigationItem = {
  id: string
  menu_id: string
  label: string
  url: string
  order: number
  openInNewTab: boolean
  parent_id: string | null
  is_active: boolean
  /** Manual thumbnail override; falls back to `resolved_thumbnail` when empty. */
  thumbnail: string | null
  /** Entity type matched from `url` (see backend nav-link-resolver.ts), or null for static pages. */
  link_type: NavLinkType | null
  /** Thumbnail auto-resolved from the entity `url` points to (product/post/event/…). */
  resolved_thumbnail: string | null
  /** Icon key from the shared nav icon set (nav-icons.tsx); used when display_mode is "icon". */
  icon: string | null
  /** What renders before the label on the storefront's main nav bar (top-level items). */
  display_mode: "none" | "icon" | "image"
  children?: NavigationItem[]
}

export type NavigationMenusResponse = {
  menus: NavigationMenu[]
  count: number
}

export type NavigationTreeResponse = {
  navigations: NavigationItem[]
  tree?: NavigationItem[]
  menu?: NavigationMenu | null
}
