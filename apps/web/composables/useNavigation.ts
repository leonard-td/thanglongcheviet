export interface NavigationTreeItem {
  id: string
  label?: string
  name?: string
  title?: string
  url: string
  order: number
  parent_id?: string | null
  children: NavigationTreeItem[]
}

export interface NavLink {
  key: string
  path: string
  label?: string
  children?: { key: string; path: string; label?: string }[]
}

export function useNavigation() {
  const { fetchMedusa } = useMedusaApi()

  const getStoreNavigation = async (): Promise<NavigationTreeItem[]> => {
    try {
      const data = await fetchMedusa<{ navigations: NavigationTreeItem[] }>(`/store/navigations`, {
        method: 'GET',
      })
      return data?.navigations || []
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[navigation] Failed to load menu from Medusa:', error)
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
        }

        if (item.children && item.children.length > 0) {
          link.children = [...item.children]
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((child) => ({
              key: child.id,
              path: child.url,
              label: child.label || child.title || child.name,
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
