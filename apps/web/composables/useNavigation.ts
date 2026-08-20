/**
 * Matches NavLinkType in apps/backend/src/modules/navigation/nav-link-resolver.ts
 * — the entity type the backend matched from this item's `url`.
 */
export type NavLinkType =
  | "product"
  | "product_category"
  | "product_collection"
  | "product_topic"
  | "post"
  | "post_topic"
  | "event"
  | "event_topic"

/** Matches NavIconKey in apps/backend/src/admin/routes/navigation/nav-icons.tsx. */
export type NavDisplayMode = "none" | "icon" | "image"

export interface NavigationTreeItem {
  id: string
  label?: string
  name?: string
  title?: string
  url: string
  order: number
  parent_id?: string | null
  openInNewTab?: boolean
  /** Manual override or auto-resolved from `url` — see GET /store/navigations. */
  thumbnail?: string | null
  link_type?: NavLinkType | null
  /** Current canonical path for `link_type`, rebuilt server-side; null for static/unrecognized urls — see GET /store/navigations. */
  resolved_path?: string | null
  /** Icon key rendered via widgets/Icon.vue when display_mode is "icon". */
  icon?: string | null
  /** What to show before the label on the main nav bar (top-level items only). */
  display_mode?: NavDisplayMode | null
  children: NavigationTreeItem[]
}

export interface NavLink {
  key: string
  path: string
  label?: string
  openInNewTab?: boolean
  thumbnail?: string | null
  linkType?: NavLinkType | null
  icon?: string | null
  displayMode?: NavDisplayMode | null
  children?: {
    key: string
    path: string
    label?: string
    openInNewTab?: boolean
    thumbnail?: string | null
    linkType?: NavLinkType | null
  }[]
}

/**
 * Loads the storefront header menu from Medusa.
 * The backend resolves the currently Active menu template — no client menu id needed.
 * `NUXT_PUBLIC_MEDUSA_NAVIGATION_ID` is legacy and unused.
 */
export function useNavigation() {
  const { fetchMedusa } = useMedusaApi()
  const { resolveMediaUrl } = useMediaUrl()

  const getStoreNavigation = async (): Promise<NavigationTreeItem[]> => {
    try {
      const data = await fetchMedusa<{ navigations: NavigationTreeItem[] }>(
        `/store/navigations`,
        {
          method: "GET",
        }
      )
      return data?.navigations || []
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[navigation] Failed to load menu from Medusa:", error)
      }
      return []
    }
  }

  const mapNavigationToNavLinks = (items: NavigationTreeItem[]): NavLink[] => {
    return [...items]
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((item) => {
        const link: NavLink = {
          key: item.id,
          path: item.resolved_path || item.url,
          label: item.label || item.title || item.name,
          openInNewTab: !!item.openInNewTab,
          thumbnail: resolveMediaUrl(item.thumbnail) || null,
          linkType: item.link_type ?? null,
          icon: item.icon ?? null,
          displayMode: item.display_mode ?? null,
        }

        if (item.children && item.children.length > 0) {
          link.children = [...item.children]
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((child) => ({
              key: child.id,
              path: child.resolved_path || child.url,
              label: child.label || child.title || child.name,
              openInNewTab: !!child.openInNewTab,
              thumbnail: resolveMediaUrl(child.thumbnail) || null,
              linkType: child.link_type ?? null,
            }))
        }

        return link
      })
  }

  return {
    getStoreNavigation,
    mapNavigationToNavLinks,
  }
}
