import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  DotsSix,
  EllipsisHorizontal,
  FolderOpen,
  ListBullet,
  PlusMini,
  TriangleDownMini,
  TriangleRightMini,
} from "@medusajs/icons"
import {
  Badge,
  Button,
  Checkbox,
  Drawer,
  DropdownMenu,
  Heading,
  IconButton,
  Input,
  Label,
  Text,
  clx,
  toast,
  usePrompt,
} from "@medusajs/ui"
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
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

type ItemFormState = {
  id?: string
  label: string
  url: string
  openInNewTab: boolean
  is_active: boolean
  parent_id: string | null
}

const emptyItemForm = (parentId: string | null = null): ItemFormState => ({
  label: "",
  url: "/",
  openInNewTab: false,
  is_active: true,
  parent_id: parentId,
})

function flattenForReorder(tree: NavigationItem[]) {
  const items: Array<{ id: string; parent_id: string | null; order: number }> =
    []
  tree.forEach((root, index) => {
    items.push({ id: root.id, parent_id: null, order: index })
    ;(root.children || []).forEach((child, childIndex) => {
      items.push({
        id: child.id,
        parent_id: root.id,
        order: childIndex,
      })
    })
  })
  return items
}

type SortableRowProps = {
  item: NavigationItem
  depth: number
  expanded: boolean
  onToggleExpand: () => void
  onEdit: () => void
  onAddChild: () => void
  onDelete: () => void
  onToggleActive: () => void
}

const SortableNavRow = ({
  item,
  depth,
  expanded,
  onToggleExpand,
  onEdit,
  onAddChild,
  onDelete,
  onToggleActive,
}: SortableRowProps) => {
  const { t } = useTranslation()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  }

  const hasChildren = (item.children?.length || 0) > 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clx(
        "group flex items-center gap-x-2 border-b border-ui-border-base px-3 py-2 hover:bg-ui-bg-subtle-hover",
        !item.is_active && "opacity-60"
      )}
    >
      <div style={{ width: depth * 20 }} className="flex-shrink-0" />

      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-ui-fg-muted touch-none"
        aria-label={t("navigation.actions.drag")}
        {...attributes}
        {...listeners}
      >
        <DotsSix />
      </button>

      {depth === 0 ? (
        <button
          type="button"
          className="text-ui-fg-muted w-5 flex items-center justify-center"
          onClick={onToggleExpand}
          disabled={!hasChildren}
        >
          {hasChildren ? (
            expanded ? (
              <TriangleDownMini />
            ) : (
              <TriangleRightMini />
            )
          ) : (
            <span className="w-4" />
          )}
        </button>
      ) : (
        <span className="w-5" />
      )}

      <div className="min-w-0 flex-1">
        <Text size="small" weight="plus" className="truncate">
          {item.label}
        </Text>
        <Text size="xsmall" className="text-ui-fg-subtle truncate">
          {item.url}
        </Text>
      </div>

      {!item.is_active && (
        <Badge size="2xsmall" color="grey">
          {t("navigation.status.hidden")}
        </Badge>
      )}

      <div onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenu.Trigger asChild>
            <IconButton size="small" variant="transparent">
              <EllipsisHorizontal />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item onClick={onEdit}>
              {t("navigation.actions.edit")}
            </DropdownMenu.Item>
            {depth === 0 && (
              <DropdownMenu.Item onClick={onAddChild}>
                {t("navigation.actions.addChild")}
              </DropdownMenu.Item>
            )}
            <DropdownMenu.Item onClick={onToggleActive}>
              {item.is_active
                ? t("navigation.actions.hide")
                : t("navigation.actions.show")}
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item
              className="text-ui-fg-error"
              onClick={onDelete}
            >
              {t("navigation.actions.delete")}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
      </div>
    </div>
  )
}

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
    })
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

    const activeId = String(active.id)
    const overId = String(over.id)

    const rootIndex = tree.findIndex((item) => item.id === activeId)
    const overRootIndex = tree.findIndex((item) => item.id === overId)

    // Reorder roots
    if (rootIndex >= 0 && overRootIndex >= 0) {
      await persistTree(arrayMove(tree, rootIndex, overRootIndex))
      return
    }

    // Reorder children within the same parent
    for (let parentIndex = 0; parentIndex < tree.length; parentIndex++) {
      const children = tree[parentIndex].children || []
      const oldIndex = children.findIndex((item) => item.id === activeId)
      const newIndex = children.findIndex((item) => item.id === overId)
      if (oldIndex < 0 || newIndex < 0) {
        continue
      }

      const nextChildren = arrayMove(children, oldIndex, newIndex)
      const nextTree = tree.map((node, index) =>
        index === parentIndex ? { ...node, children: nextChildren } : node
      )
      await persistTree(nextTree)
      return
    }
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
        {/* Left: menu templates */}
        <aside className="flex flex-col bg-ui-bg-subtle">
          <div className="border-b border-ui-border-base px-4 py-3">
            <Text size="small" weight="plus" className="text-ui-fg-subtle">
              {t("navigation.menusTitle")}
            </Text>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {menusLoading ? (
              <Text size="small" className="px-2 py-3 text-ui-fg-muted">
                {t("navigation.loading")}
              </Text>
            ) : menus.length === 0 ? (
              <Text size="small" className="px-2 py-3 text-ui-fg-muted">
                {t("navigation.emptyMenus")}
              </Text>
            ) : (
              menus.map((menu) => (
                <div
                  key={menu.id}
                  className={clx(
                    "mb-1 flex items-center gap-x-1 rounded-md px-2 py-2",
                    selectedMenuId === menu.id
                      ? "bg-ui-bg-base shadow-borders-base"
                      : "hover:bg-ui-bg-base-hover"
                  )}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setSelectedMenuId(menu.id)}
                  >
                    <div className="flex items-center gap-x-2">
                      <FolderOpen className="text-ui-fg-muted flex-shrink-0" />
                      <div className="min-w-0">
                        <Text size="small" weight="plus" className="truncate">
                          {menu.name}
                        </Text>
                        <Text
                          size="xsmall"
                          className="text-ui-fg-muted truncate"
                        >
                          {menu.slug}
                        </Text>
                      </div>
                    </div>
                  </button>
                  {menu.is_active && (
                    <Badge size="2xsmall" color="green">
                      {t("navigation.status.active")}
                    </Badge>
                  )}
                  <DropdownMenu>
                    <DropdownMenu.Trigger asChild>
                      <IconButton size="small" variant="transparent">
                        <EllipsisHorizontal />
                      </IconButton>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content>
                      {!menu.is_active && (
                        <DropdownMenu.Item onClick={() => handleActivate(menu)}>
                          {t("navigation.actions.setActive")}
                        </DropdownMenu.Item>
                      )}
                      <DropdownMenu.Item
                        className="text-ui-fg-error"
                        onClick={() => handleDeleteMenu(menu)}
                        disabled={menu.is_active}
                      >
                        {t("navigation.actions.deleteMenu")}
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Right: tree */}
        <section className="flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-ui-border-base px-4 py-3">
            <div className="min-w-0">
              <Text size="small" weight="plus">
                {selectedMenu?.name || t("navigation.selectMenu")}
              </Text>
              {selectedMenu?.is_active ? (
                <Text size="xsmall" className="text-ui-fg-subtle">
                  {t("navigation.activeMenuHint")}
                </Text>
              ) : selectedMenu ? (
                <Text size="xsmall" className="text-ui-fg-subtle">
                  {t("navigation.inactiveMenuHint")}
                </Text>
              ) : null}
            </div>
            <Button
              size="small"
              variant="secondary"
              disabled={!selectedMenuId}
              onClick={() => openCreateItem(null)}
            >
              <PlusMini />
              {t("navigation.actions.addRoot")}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {!selectedMenuId ? (
              <Text size="small" className="px-4 py-6 text-ui-fg-muted">
                {t("navigation.selectMenu")}
              </Text>
            ) : treeLoading ? (
              <Text size="small" className="px-4 py-6 text-ui-fg-muted">
                {t("navigation.loading")}
              </Text>
            ) : tree.length === 0 ? (
              <Text size="small" className="px-4 py-6 text-ui-fg-muted">
                {t("navigation.emptyTree")}
              </Text>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={allSortableIds}
                  strategy={verticalListSortingStrategy}
                >
                  {tree.map((root) => (
                    <div key={root.id}>
                      <SortableNavRow
                        item={root}
                        depth={0}
                        expanded={!!expanded[root.id]}
                        onToggleExpand={() =>
                          setExpanded((prev) => ({
                            ...prev,
                            [root.id]: !prev[root.id],
                          }))
                        }
                        onEdit={() => openEditItem(root)}
                        onAddChild={() => openCreateItem(root.id)}
                        onDelete={() => handleDeleteItem(root)}
                        onToggleActive={() => handleToggleItemActive(root)}
                      />
                      {expanded[root.id] &&
                        (root.children || []).map((child) => (
                          <SortableNavRow
                            key={child.id}
                            item={child}
                            depth={1}
                            expanded={false}
                            onToggleExpand={() => undefined}
                            onEdit={() => openEditItem(child)}
                            onAddChild={() => undefined}
                            onDelete={() => handleDeleteItem(child)}
                            onToggleActive={() =>
                              handleToggleItemActive(child)
                            }
                          />
                        ))}
                    </div>
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </section>
      </div>

      {/* Create menu drawer */}
      <Drawer open={menuDrawerOpen} onOpenChange={setMenuDrawerOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>{t("navigation.actions.createMenu")}</Drawer.Title>
          </Drawer.Header>
          <form onSubmit={handleCreateMenu}>
            <Drawer.Body className="flex flex-col gap-y-4">
              <div className="flex flex-col gap-y-2">
                <Label htmlFor="menu_name">{t("navigation.fields.menuName")}</Label>
                <Input
                  id="menu_name"
                  required
                  value={menuName}
                  onChange={(e) => setMenuName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-y-2">
                <Label htmlFor="menu_slug">{t("navigation.fields.menuSlug")}</Label>
                <Input
                  id="menu_slug"
                  placeholder="storefront-header"
                  value={menuSlug}
                  onChange={(e) => setMenuSlug(e.target.value)}
                />
                <Text size="xsmall" className="text-ui-fg-muted">
                  {t("navigation.fields.menuSlugHint")}
                </Text>
              </div>
              <label className="flex items-center gap-x-2 text-sm">
                <Checkbox
                  checked={activateOnCreate}
                  onCheckedChange={(v) => setActivateOnCreate(v === true)}
                />
                {t("navigation.fields.activateOnCreate")}
              </label>
            </Drawer.Body>
            <Drawer.Footer>
              <Button
                variant="secondary"
                type="button"
                onClick={() => setMenuDrawerOpen(false)}
              >
                {t("navigation.actions.cancel")}
              </Button>
              <Button type="submit" isLoading={creatingMenu}>
                {t("navigation.actions.createMenu")}
              </Button>
            </Drawer.Footer>
          </form>
        </Drawer.Content>
      </Drawer>

      {/* Create / edit item drawer */}
      <Drawer open={itemDrawerOpen} onOpenChange={setItemDrawerOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>
              {itemForm.id
                ? t("navigation.actions.edit")
                : itemForm.parent_id
                  ? t("navigation.actions.addChild")
                  : t("navigation.actions.addRoot")}
            </Drawer.Title>
          </Drawer.Header>
          <form onSubmit={handleSaveItem}>
            <Drawer.Body className="flex flex-col gap-y-4">
              <div className="flex flex-col gap-y-2">
                <Label htmlFor="item_label">{t("navigation.fields.label")}</Label>
                <Input
                  id="item_label"
                  required
                  value={itemForm.label}
                  onChange={(e) =>
                    setItemForm((prev) => ({ ...prev, label: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col gap-y-2">
                <Label htmlFor="item_url">{t("navigation.fields.url")}</Label>
                <Input
                  id="item_url"
                  required
                  value={itemForm.url}
                  onChange={(e) =>
                    setItemForm((prev) => ({ ...prev, url: e.target.value }))
                  }
                />
              </div>
              <label className="flex items-center gap-x-2 text-sm">
                <Checkbox
                  checked={itemForm.openInNewTab}
                  onCheckedChange={(v) =>
                    setItemForm((prev) => ({
                      ...prev,
                      openInNewTab: v === true,
                    }))
                  }
                />
                {t("navigation.fields.openInNewTab")}
              </label>
              <label className="flex items-center gap-x-2 text-sm">
                <Checkbox
                  checked={itemForm.is_active}
                  onCheckedChange={(v) =>
                    setItemForm((prev) => ({
                      ...prev,
                      is_active: v === true,
                    }))
                  }
                />
                {t("navigation.fields.isActive")}
              </label>
            </Drawer.Body>
            <Drawer.Footer>
              <Button
                variant="secondary"
                type="button"
                onClick={() => setItemDrawerOpen(false)}
              >
                {t("navigation.actions.cancel")}
              </Button>
              <Button
                type="submit"
                isLoading={savingItem || updatingItem}
              >
                {t("navigation.actions.save")}
              </Button>
            </Drawer.Footer>
          </form>
        </Drawer.Content>
      </Drawer>
    </PageLayout>
  )
}

export const config = defineRouteConfig({
  label: "menu.navigation",
  translationNs: "translation",
  icon: ListBullet,
})

export default NavigationPage
