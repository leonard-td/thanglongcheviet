import type { NavigationItem } from "../../types/navigation"

export type ItemFormState = {
  id?: string
  label: string
  url: string
  openInNewTab: boolean
  is_active: boolean
  parent_id: string | null
}

export const emptyItemForm = (
  parentId: string | null = null
): ItemFormState => ({
  label: "",
  url: "/",
  openInNewTab: false,
  is_active: true,
  parent_id: parentId,
})

export function flattenForReorder(tree: NavigationItem[]) {
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

type RootLoc = { kind: "root"; index: number }
type ChildLoc = { kind: "child"; parentIndex: number; index: number }
export type ItemLoc = RootLoc | ChildLoc

export function findItemLocation(
  tree: NavigationItem[],
  id: string
): ItemLoc | null {
  const rootIndex = tree.findIndex((item) => item.id === id)
  if (rootIndex >= 0) {
    return { kind: "root", index: rootIndex }
  }

  for (let parentIndex = 0; parentIndex < tree.length; parentIndex++) {
    const children = tree[parentIndex].children || []
    const index = children.findIndex((item) => item.id === id)
    if (index >= 0) {
      return { kind: "child", parentIndex, index }
    }
  }

  return null
}

function cloneTree(tree: NavigationItem[]): NavigationItem[] {
  return tree.map((root) => ({
    ...root,
    children: (root.children || []).map((child) => ({ ...child })),
  }))
}

function takeItem(
  tree: NavigationItem[],
  loc: ItemLoc
): { next: NavigationItem[]; item: NavigationItem } {
  const next = cloneTree(tree)

  if (loc.kind === "root") {
    const [item] = next.splice(loc.index, 1)
    return {
      next,
      item: { ...item, children: item.children ? [...item.children] : [] },
    }
  }

  const parent = next[loc.parentIndex]
  const children = [...(parent.children || [])]
  const [item] = children.splice(loc.index, 1)
  next[loc.parentIndex] = { ...parent, children }
  return { next, item: { ...item, children: [] } }
}

/**
 * Nest a root under the previous sibling (only if it has no children).
 */
export function indentItem(
  tree: NavigationItem[],
  id: string
): NavigationItem[] | null {
  const loc = findItemLocation(tree, id)
  if (!loc || loc.kind !== "root" || loc.index === 0) {
    return null
  }

  const item = tree[loc.index]
  if ((item.children?.length || 0) > 0) {
    return null
  }

  const next = cloneTree(tree)
  const [moved] = next.splice(loc.index, 1)
  const parentIndex = loc.index - 1
  const parent = next[parentIndex]
  const children = [...(parent.children || [])]
  children.push({ ...moved, parent_id: parent.id, children: [] })
  next[parentIndex] = { ...parent, children }
  return next
}

/**
 * Promote a child to a root placed right after its parent.
 */
export function outdentItem(
  tree: NavigationItem[],
  id: string
): NavigationItem[] | null {
  const loc = findItemLocation(tree, id)
  if (!loc || loc.kind !== "child") {
    return null
  }

  const next = cloneTree(tree)
  const parent = next[loc.parentIndex]
  const children = [...(parent.children || [])]
  const [moved] = children.splice(loc.index, 1)
  next[loc.parentIndex] = { ...parent, children }
  next.splice(loc.parentIndex + 1, 0, {
    ...moved,
    parent_id: null,
    children: [],
  })
  return next
}

export function canIndent(tree: NavigationItem[], id: string): boolean {
  return indentItem(tree, id) !== null
}

export function canOutdent(tree: NavigationItem[], id: string): boolean {
  return outdentItem(tree, id) !== null
}

/**
 * Apply DnD: same-level reorder, nest under root, or reparent children.
 * Depth stays ≤ 2 (roots with children cannot become nested).
 */
export function applyDragEnd(
  tree: NavigationItem[],
  activeId: string,
  overId: string
): NavigationItem[] | null {
  if (activeId === overId) {
    return null
  }

  const activeLoc = findItemLocation(tree, activeId)
  const overLoc = findItemLocation(tree, overId)
  if (!activeLoc || !overLoc) {
    return null
  }

  // Same-level root reorder (nesting uses Indent / Outdent actions)
  if (activeLoc.kind === "root" && overLoc.kind === "root") {
    const next = cloneTree(tree)
    const [moved] = next.splice(activeLoc.index, 1)
    next.splice(overLoc.index, 0, moved)
    return next
  }

  // Same-parent child reorder
  if (
    activeLoc.kind === "child" &&
    overLoc.kind === "child" &&
    activeLoc.parentIndex === overLoc.parentIndex
  ) {
    const next = cloneTree(tree)
    const parent = next[activeLoc.parentIndex]
    const children = [...(parent.children || [])]
    const [moved] = children.splice(activeLoc.index, 1)
    children.splice(overLoc.index, 0, moved)
    next[activeLoc.parentIndex] = { ...parent, children }
    return next
  }

  // Drop child onto a root → append under that root (reparent)
  if (activeLoc.kind === "child" && overLoc.kind === "root") {
    const { next, item } = takeItem(tree, activeLoc)
    const parent = next[overLoc.index]
    if (!parent) {
      return null
    }
    const children = [...(parent.children || [])]
    children.push({ ...item, parent_id: parent.id, children: [] })
    next[overLoc.index] = { ...parent, children }
    return next
  }

  // Drop child onto a child of another parent → insert at that position
  if (
    activeLoc.kind === "child" &&
    overLoc.kind === "child" &&
    activeLoc.parentIndex !== overLoc.parentIndex
  ) {
    const { next, item } = takeItem(tree, activeLoc)
    // Adjust over parent index if we removed from an earlier parent
    const parentIndex =
      activeLoc.parentIndex < overLoc.parentIndex
        ? overLoc.parentIndex
        : overLoc.parentIndex
    const parent = next[parentIndex]
    if (!parent) {
      return null
    }
    const children = [...(parent.children || [])]
    children.splice(overLoc.index, 0, {
      ...item,
      parent_id: parent.id,
      children: [],
    })
    next[parentIndex] = { ...parent, children }
    return next
  }

  // Drop root (no children) onto a child → nest under that child's parent
  if (activeLoc.kind === "root" && overLoc.kind === "child") {
    const active = tree[activeLoc.index]
    if ((active.children?.length || 0) > 0) {
      return null
    }
    const { next, item } = takeItem(tree, activeLoc)
    const parentIndex =
      activeLoc.index < overLoc.parentIndex
        ? overLoc.parentIndex - 1
        : overLoc.parentIndex
    const parent = next[parentIndex]
    if (!parent) {
      return null
    }
    const children = [...(parent.children || [])]
    children.splice(overLoc.index, 0, {
      ...item,
      parent_id: parent.id,
      children: [],
    })
    next[parentIndex] = { ...parent, children }
    return next
  }

  return null
}
