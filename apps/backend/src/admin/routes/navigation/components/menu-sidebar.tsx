import { EllipsisHorizontal, FolderOpen } from "@medusajs/icons"
import {
  Badge,
  DropdownMenu,
  IconButton,
  Text,
  clx,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type { NavigationMenu } from "../../../types/navigation"

type MenuSidebarProps = {
  menus: NavigationMenu[]
  selectedMenuId: string | null
  isLoading: boolean
  onSelect: (id: string) => void
  onActivate: (menu: NavigationMenu) => void
  onDelete: (menu: NavigationMenu) => void
}

export const MenuSidebar = ({
  menus,
  selectedMenuId,
  isLoading,
  onSelect,
  onActivate,
  onDelete,
}: MenuSidebarProps) => {
  const { t } = useTranslation()

  return (
    <aside className="flex flex-col bg-ui-bg-subtle">
      <div className="border-b border-ui-border-base px-4 py-3">
        <Text size="small" weight="plus" className="text-ui-fg-subtle">
          {t("navigation.menusTitle")}
        </Text>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
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
                onClick={() => onSelect(menu.id)}
              >
                <div className="flex items-center gap-x-2">
                  <FolderOpen className="text-ui-fg-muted flex-shrink-0" />
                  <div className="min-w-0">
                    <Text size="small" weight="plus" className="truncate">
                      {menu.name}
                    </Text>
                    <Text size="xsmall" className="text-ui-fg-muted truncate">
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
                    <DropdownMenu.Item onClick={() => onActivate(menu)}>
                      {t("navigation.actions.setActive")}
                    </DropdownMenu.Item>
                  )}
                  <DropdownMenu.Item
                    className="text-ui-fg-error"
                    onClick={() => onDelete(menu)}
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
  )
}
