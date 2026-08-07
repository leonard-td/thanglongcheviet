export interface NavigationTreeItem {
  id: string
  label?: string
  name?: string
  title?: string
  url: string
  order: number
  parent_id?: string | null
  openInNewTab?: boolean
  children: NavigationTreeItem[]
}

export interface NavLink {
  key: string
  path: string
  label?: string
  openInNewTab?: boolean
  children?: {
    key: string
    path: string
    label?: string
    openInNewTab?: boolean
  }[]
}

/**
 * Loads the storefront header menu from Medusa.
 * The backend resolves the currently Active menu template — no client menu id needed.
 * `NUXT_PUBLIC_MEDUSA_NAVIGATION_ID` is legacy and unused.
 */
export function useNavigation() {
  const { fetchMedusa } = useMedusaApi()

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
          path: item.url,
          label: item.label || item.title || item.name,
          openInNewTab: !!item.openInNewTab,
        }

        if (item.children && item.children.length > 0) {
          link.children = [...item.children]
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((child) => ({
              key: child.id,
              path: child.url,
              label: child.label || child.title || child.name,
              openInNewTab: !!child.openInNewTab,
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
