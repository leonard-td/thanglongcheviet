import { PlusMini } from "@medusajs/icons"
import { Button, Text } from "@medusajs/ui"
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  type SensorDescriptor,
  type SensorOptions,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { useTranslation } from "react-i18next"
import type { NavigationItem, NavigationMenu } from "../../../types/navigation"
import { canIndent, canOutdent } from "../tree-utils"
import { SortableNavRow } from "./sortable-nav-row"

type TreePanelProps = {
  selectedMenu: NavigationMenu | null
  selectedMenuId: string | null
  tree: NavigationItem[]
  expanded: Record<string, boolean>
  isLoading: boolean
  sortableIds: string[]
  sensors: SensorDescriptor<SensorOptions>[]
  onAddRoot: () => void
  onDragEnd: (event: DragEndEvent) => void
  onToggleExpand: (id: string) => void
  onEdit: (item: NavigationItem) => void
  onAddChild: (parentId: string) => void
  onDelete: (item: NavigationItem) => void
  onToggleActive: (item: NavigationItem) => void
  onIndent: (item: NavigationItem) => void
  onOutdent: (item: NavigationItem) => void
}

export const TreePanel = ({
  selectedMenu,
  selectedMenuId,
  tree,
  expanded,
  isLoading,
  sortableIds,
  sensors,
  onAddRoot,
  onDragEnd,
  onToggleExpand,
  onEdit,
  onAddChild,
  onDelete,
  onToggleActive,
  onIndent,
  onOutdent,
}: TreePanelProps) => {
  const { t } = useTranslation()

  return (
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
          onClick={onAddRoot}
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
        ) : isLoading ? (
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
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={sortableIds}
              strategy={verticalListSortingStrategy}
            >
              {tree.map((root) => (
                <div key={root.id}>
                  <SortableNavRow
                    item={root}
                    depth={0}
                    expanded={!!expanded[root.id]}
                    canIndent={canIndent(tree, root.id)}
                    canOutdent={false}
                    onToggleExpand={() => onToggleExpand(root.id)}
                    onEdit={() => onEdit(root)}
                    onAddChild={() => onAddChild(root.id)}
                    onDelete={() => onDelete(root)}
                    onToggleActive={() => onToggleActive(root)}
                    onIndent={() => onIndent(root)}
                    onOutdent={() => undefined}
                  />
                  {expanded[root.id] &&
                    (root.children || []).map((child) => (
                      <SortableNavRow
                        key={child.id}
                        item={child}
                        depth={1}
                        expanded={false}
                        canIndent={false}
                        canOutdent={canOutdent(tree, child.id)}
                        onToggleExpand={() => undefined}
                        onEdit={() => onEdit(child)}
                        onAddChild={() => undefined}
                        onDelete={() => onDelete(child)}
                        onToggleActive={() => onToggleActive(child)}
                        onIndent={() => undefined}
                        onOutdent={() => onOutdent(child)}
                      />
                    ))}
                </div>
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </section>
  )
}
