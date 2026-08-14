import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ListBullet, PlusMini } from "@medusajs/icons"
import { Button, Heading, toast, usePrompt } from "@medusajs/ui"
import {
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import PageLayout from "../../components/page-layout"
import { sdk } from "../../lib/sdk"
import type {
  NavigationItem,
  NavigationMenu,
  NavigationMenusResponse,
  NavigationTreeResponse,
} from "../../types/navigation"
import { ItemDrawer } from "./components/item-drawer"
import { MenuDrawer } from "./components/menu-drawer"
import { MenuSidebar } from "./components/menu-sidebar"
import { TreePanel } from "./components/tree-panel"
import {
  applyDragEnd,
  emptyItemForm,
  flattenForReorder,
  indentItem,
  outdentItem,
  type ItemFormState,
} from "./tree-utils"

const NavigationPage = () => {
  const { t } = useTranslation()
  const prompt = usePrompt()
  const queryClient = useQueryClient()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [tree, setTree] = useState<NavigationItem[]>([])

  const [menuDrawerOpen, setMenuDrawerOpen] = useState(false)
  const [menuName, setMenuName] = useState("")
  const [menuSlug, setMenuSlug] = useState("")
  const [activateOnCreate, setActivateOnCreate] = useState(false)

  const [itemDrawerOpen, setItemDrawerOpen] = useState(false)
  const [itemForm, setItemForm] = useState<ItemFormState>(emptyItemForm())
  const [itemResolvedThumbnail, setItemResolvedThumbnail] = useState<
    string | null
  >(null)

  const { data: menusData, isLoading: menusLoading } =
    useQuery<NavigationMenusResponse>({
      queryFn: () =>
        sdk.client.fetch(`/admin/navigation-menus`, {
          query: { limit: 50, offset: 0 },
        }),
      queryKey: ["navigation-menus"],
    })

  const menus = menusData?.menus || []

  useEffect(() => {
    if (!selectedMenuId && menus.length) {
      const active = menus.find((menu) => menu.is_active) || menus[0]
      setSelectedMenuId(active.id)
    }
  }, [menus, selectedMenuId])

  const { data: treeData, isLoading: treeLoading } =
    useQuery<NavigationTreeResponse>({
      queryFn: () =>
        sdk.client.fetch(`/admin/navigations`, {
          query: { menu_id: selectedMenuId! },
        }),
      queryKey: ["navigation-tree", selectedMenuId],
      enabled: !!selectedMenuId,
    })

  useEffect(() => {
    if (treeData?.navigations) {
      setTree(treeData.navigations)
      setExpanded((prev) => {
        const next = { ...prev }
        treeData.navigations.forEach((node) => {
          if (next[node.id] === undefined) {
            next[node.id] = true
          }
        })
        return next
      })
    }
  }, [treeData])

  const selectedMenu = useMemo(
    () => menus.find((menu) => menu.id === selectedMenuId) || null,
    [menus, selectedMenuId]
  )

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["navigation-menus"] })
    queryClient.invalidateQueries({ queryKey: ["navigation-tree"] })
  }

  const { mutateAsync: createMenu, isPending: creatingMenu } = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      sdk.client.fetch<{ menu: NavigationMenu }>(`/admin/navigation-menus`, {
        method: "POST",
        body,
      }),
    onSuccess: invalidate,
  })

  const { mutateAsync: activateMenu } = useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/admin/navigation-menus/${id}/activate`, {
        method: "POST",
        body: {},
      }),
    onSuccess: invalidate,
  })

  const { mutateAsync: deleteMenu } = useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/admin/navigation-menus/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  })

  const { mutateAsync: createItem, isPending: savingItem } = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      sdk.client.fetch(`/admin/navigations`, { method: "POST", body }),
    onSuccess: invalidate,
  })

  const { mutateAsync: updateItem, isPending: updatingItem } = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: Record<string, unknown>
    }) =>
      sdk.client.fetch(`/admin/navigations/${id}`, {
        method: "PUT",
        body,
      }),
    onSuccess: invalidate,
  })

  const { mutateAsync: deleteItem } = useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/admin/navigations/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  })

  const { mutateAsync: reorderItems } = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      sdk.client.fetch<NavigationTreeResponse>(`/admin/navigations/reorder`, {
        method: "POST",
        body,
      }),
    onSuccess: invalidate,
  })

  const openCreateMenu = () => {
    setMenuName("")
    setMenuSlug("")
    setActivateOnCreate(false)
    setMenuDrawerOpen(true)
  }

  const handleCreateMenu = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      const result = await createMenu({
        name: menuName,
        slug: menuSlug || undefined,
        activate: activateOnCreate,
      })
      toast.success(t("navigation.messages.menuCreated"))
      setMenuDrawerOpen(false)
      setSelectedMenuId(result.menu.id)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("navigation.messages.menuCreateFailed")
      )
    }
  }

  const handleActivate = async (menu: NavigationMenu) => {
    try {
      await activateMenu(menu.id)
      toast.success(t("navigation.messages.menuActivated", { name: menu.name }))
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("navigation.messages.menuActivateFailed")
      )
    }
  }

  const handleDeleteMenu = async (menu: NavigationMenu) => {
    const confirmed = await prompt({
      title: t("navigation.messages.deleteMenuTitle"),
      description: t("navigation.messages.deleteMenuDesc", { name: menu.name }),
      confirmText: t("navigation.messages.confirmDelete"),
      cancelText: t("navigation.messages.cancelDelete"),
    })
    if (!confirmed) return

    try {
      await deleteMenu(menu.id)
      toast.success(t("navigation.messages.menuDeleted"))
      if (selectedMenuId === menu.id) {
        setSelectedMenuId(null)
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("navigation.messages.menuDeleteFailed")
      )
    }
  }

  const openCreateItem = (parentId: string | null = null) => {
    setItemForm(emptyItemForm(parentId))
    setItemResolvedThumbnail(null)
    setItemDrawerOpen(true)
  }

  const openEditItem = (item: NavigationItem) => {
    setItemForm({
      id: item.id,
      label: item.label,
      url: item.url,
      openInNewTab: item.openInNewTab,
      is_active: item.is_active,
      parent_id: item.parent_id,
      thumbnail: item.thumbnail ?? "",
      icon: item.icon ?? "",
      display_mode: item.display_mode ?? "none",
    })
    setItemResolvedThumbnail(item.resolved_thumbnail ?? null)
    setItemDrawerOpen(true)
  }

  const handleSaveItem = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedMenuId) return

    try {
      if (itemForm.id) {
        await updateItem({
          id: itemForm.id,
          body: {
            label: itemForm.label,
            url: itemForm.url,
            openInNewTab: itemForm.openInNewTab,
            is_active: itemForm.is_active,
            parent_id: itemForm.parent_id,
            thumbnail: itemForm.thumbnail || null,
            icon: itemForm.icon || null,
            display_mode: itemForm.display_mode,
          },
        })
        toast.success(t("navigation.messages.itemUpdated"))
      } else {
        await createItem({
          menu_id: selectedMenuId,
          label: itemForm.label,
          url: itemForm.url,
          openInNewTab: itemForm.openInNewTab,
          is_active: itemForm.is_active,
          parent_id: itemForm.parent_id,
          thumbnail: itemForm.thumbnail || null,
          icon: itemForm.icon || null,
          display_mode: itemForm.display_mode,
        })
        toast.success(t("navigation.messages.itemCreated"))
      }
      setItemDrawerOpen(false)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("navigation.messages.itemSaveFailed")
      )
    }
  }

  const handleDeleteItem = async (item: NavigationItem) => {
    const confirmed = await prompt({
      title: t("navigation.messages.deleteItemTitle"),
      description: t("navigation.messages.deleteItemDesc", {
        name: item.label,
      }),
      confirmText: t("navigation.messages.confirmDelete"),
      cancelText: t("navigation.messages.cancelDelete"),
    })
    if (!confirmed) return

    try {
      await deleteItem(item.id)
      toast.success(t("navigation.messages.itemDeleted"))
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("navigation.messages.itemDeleteFailed")
      )
    }
  }

  const handleToggleItemActive = async (item: NavigationItem) => {
    try {
      await updateItem({
        id: item.id,
        body: { is_active: !item.is_active },
      })
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("navigation.messages.itemSaveFailed")
      )
    }
  }

  const persistTree = async (nextTree: NavigationItem[]) => {
    if (!selectedMenuId) return
    setTree(nextTree)
    try {
      const result = await reorderItems({
        menu_id: selectedMenuId,
        items: flattenForReorder(nextTree),
      })
      if (result.navigations) {
        setTree(result.navigations)
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("navigation.messages.reorderFailed")
      )
      invalidate()
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const nextTree = applyDragEnd(tree, String(active.id), String(over.id))
    if (!nextTree) return
    await persistTree(nextTree)
  }

  const handleIndent = async (item: NavigationItem) => {
    const nextTree = indentItem(tree, item.id)
    if (!nextTree) return
    setExpanded((prev) => {
      const parent = nextTree.find((root) =>
        (root.children || []).some((child) => child.id === item.id)
      )
      return parent ? { ...prev, [parent.id]: true } : prev
    })
    await persistTree(nextTree)
  }

  const handleOutdent = async (item: NavigationItem) => {
    const nextTree = outdentItem(tree, item.id)
    if (!nextTree) return
    await persistTree(nextTree)
  }

  const allSortableIds = useMemo(() => {
    const ids: string[] = []
    tree.forEach((root) => {
      ids.push(root.id)
      if (expanded[root.id]) {
        ;(root.children || []).forEach((child) => ids.push(child.id))
      }
    })
    return ids
  }, [tree, expanded])

  return (
    <PageLayout className="overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>{t("navigation.title")}</Heading>
          <p className="text-ui-fg-subtle text-sm">{t("navigation.hint")}</p>
        </div>
        <Button size="small" onClick={openCreateMenu}>
          <PlusMini />
          {t("navigation.actions.createMenu")}
        </Button>
      </div>

      <div className="grid min-h-[560px] grid-cols-1 divide-y border-t border-ui-border-base md:grid-cols-[280px_1fr] md:divide-x md:divide-y-0">
        <MenuSidebar
          menus={menus}
          selectedMenuId={selectedMenuId}
          isLoading={menusLoading}
          onSelect={setSelectedMenuId}
          onActivate={handleActivate}
          onDelete={handleDeleteMenu}
        />
        <TreePanel
          selectedMenu={selectedMenu}
          selectedMenuId={selectedMenuId}
          tree={tree}
          expanded={expanded}
          isLoading={treeLoading}
          sortableIds={allSortableIds}
          sensors={sensors}
          onAddRoot={() => openCreateItem(null)}
          onDragEnd={handleDragEnd}
          onToggleExpand={(id) =>
            setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
          }
          onEdit={openEditItem}
          onAddChild={(parentId) => openCreateItem(parentId)}
          onDelete={handleDeleteItem}
          onToggleActive={handleToggleItemActive}
          onIndent={handleIndent}
          onOutdent={handleOutdent}
        />
      </div>

      <MenuDrawer
        open={menuDrawerOpen}
        onOpenChange={setMenuDrawerOpen}
        name={menuName}
        slug={menuSlug}
        activateOnCreate={activateOnCreate}
        isLoading={creatingMenu}
        onNameChange={setMenuName}
        onSlugChange={setMenuSlug}
        onActivateChange={setActivateOnCreate}
        onSubmit={handleCreateMenu}
      />

      <ItemDrawer
        open={itemDrawerOpen}
        onOpenChange={setItemDrawerOpen}
        form={itemForm}
        isLoading={savingItem || updatingItem}
        resolvedThumbnail={itemResolvedThumbnail}
        onChange={setItemForm}
        onSubmit={handleSaveItem}
      />
    </PageLayout>
  )
}

export const config = defineRouteConfig({
  label: "menu.navigation",
  translationNs: "translation",
  icon: ListBullet,
})

export default NavigationPage
