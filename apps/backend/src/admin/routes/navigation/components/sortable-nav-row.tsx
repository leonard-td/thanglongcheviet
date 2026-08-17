import {
  DotsSix,
  EllipsisHorizontal,
  PhotoSolid,
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
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import type { NavigationItem, NavLinkType } from "../../../types/navigation"
import { NavIconOrImagePreview } from "../nav-icons"

const LINK_TYPE_LABEL_KEYS: Record<NavLinkType, string> = {
  product: "navigation.linkTypes.product",
  product_category: "navigation.linkTypes.productCategory",
  product_collection: "navigation.linkTypes.productCollection",
  product_topic: "navigation.linkTypes.productTopic",
  post: "navigation.linkTypes.post",
  post_topic: "navigation.linkTypes.postTopic",
  event: "navigation.linkTypes.event",
  event_topic: "navigation.linkTypes.eventTopic",
}

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
  const thumbnail = item.thumbnail || item.resolved_thumbnail || null

  const [imageFailed, setImageFailed] = useState(false)
  useEffect(() => setImageFailed(false), [thumbnail])

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

      <div className="h-8 w-11 flex-shrink-0 overflow-hidden rounded border border-ui-border-base bg-ui-bg-subtle flex items-center justify-center">
        {thumbnail && !imageFailed ? (
          // key={thumbnail} forces a fresh mount per URL so a previous
          // load failure never carries over onto the next (valid) image.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={thumbnail}
            src={thumbnail}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <PhotoSolid className="text-ui-fg-muted" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-x-1.5">
          <Text size="small" weight="plus" className="truncate">
            {item.label}
          </Text>
          {item.link_type && (
            <Badge size="2xsmall" color="blue">
              {t(LINK_TYPE_LABEL_KEYS[item.link_type])}
            </Badge>
          )}
          {item.display_mode === "icon" && item.icon && (
            <Badge
              size="2xsmall"
              color="purple"
              className="inline-flex items-center gap-x-1"
            >
              <NavIconOrImagePreview name={item.icon} className="h-3 w-3" />
              {t("navigation.fields.displayModeIcon")}
            </Badge>
          )}
          {item.display_mode === "image" && (
            <Badge size="2xsmall" color="purple">
              {t("navigation.fields.displayModeImage")}
            </Badge>
          )}
        </div>
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
