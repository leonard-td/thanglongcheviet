export type NavigationMenu = {
  id: string
  name: string
  slug: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export type NavigationItem = {
  id: string
  menu_id: string
  label: string
  url: string
  order: number
  openInNewTab: boolean
  parent_id: string | null
  is_active: boolean
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
