import {
  DotsSix,
  EllipsisHorizontal,
  TriangleDownMini,
  TriangleRightMini,
} from "@medusajs/icons"
import {
  Badge,
  DropdownMenu,
  IconButton,
  Text,
  clx,
} from "@medusajs/ui"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useTranslation } from "react-i18next"
import type { NavigationItem } from "../../types/navigation"

type SortableNavRowProps = {
  item: NavigationItem
  depth: number
  expanded: boolean
  canIndent: boolean
  canOutdent: boolean
  onToggleExpand: () => void
  onEdit: () => void
  onAddChild: () => void
  onDelete: () => void
  onToggleActive: () => void
  onIndent: () => void
  onOutdent: () => void
}

export const SortableNavRow = ({
  item,
  depth,
  expanded,
  canIndent: indentEnabled,
  canOutdent: outdentEnabled,
  onToggleExpand,
  onEdit,
  onAddChild,
  onDelete,
  onToggleActive,
  onIndent,
  onOutdent,
}: SortableNavRowProps) => {
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
            {indentEnabled && (
              <DropdownMenu.Item onClick={onIndent}>
                {t("navigation.actions.indent")}
              </DropdownMenu.Item>
            )}
            {outdentEnabled && (
              <DropdownMenu.Item onClick={onOutdent}>
                {t("navigation.actions.outdent")}
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
