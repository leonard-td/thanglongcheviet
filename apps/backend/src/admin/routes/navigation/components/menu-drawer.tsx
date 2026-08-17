import {
  Button,
  Checkbox,
  Drawer,
  Input,
  Label,
  Text,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"

type MenuDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  slug: string
  activateOnCreate: boolean
  isLoading: boolean
  onNameChange: (value: string) => void
  onSlugChange: (value: string) => void
  onActivateChange: (value: boolean) => void
  onSubmit: (event: React.FormEvent) => void
}

export const MenuDrawer = ({
  open,
  onOpenChange,
  name,
  slug,
  activateOnCreate,
  isLoading,
  onNameChange,
  onSlugChange,
  onActivateChange,
  onSubmit,
}: MenuDrawerProps) => {
  const { t } = useTranslation()

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{t("navigation.actions.createMenu")}</Drawer.Title>
        </Drawer.Header>
        <form onSubmit={onSubmit} className="flex flex-1 flex-col overflow-hidden">
          <Drawer.Body className="flex flex-1 flex-col gap-y-4 overflow-y-auto">
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="menu_name">{t("navigation.fields.menuName")}</Label>
              <Input
                id="menu_name"
                required
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="menu_slug">{t("navigation.fields.menuSlug")}</Label>
              <Input
                id="menu_slug"
                placeholder="storefront-header"
                value={slug}
                onChange={(e) => onSlugChange(e.target.value)}
              />
              <Text size="xsmall" className="text-ui-fg-muted">
                {t("navigation.fields.menuSlugHint")}
              </Text>
            </div>
            <label className="flex items-center gap-x-2 text-sm">
              <Checkbox
                checked={activateOnCreate}
                onCheckedChange={(v) => onActivateChange(v === true)}
              />
              {t("navigation.fields.activateOnCreate")}
            </label>
          </Drawer.Body>
          <Drawer.Footer>
            <Button
              variant="secondary"
              type="button"
              onClick={() => onOpenChange(false)}
            >
              {t("navigation.actions.cancel")}
            </Button>
            <Button type="submit" isLoading={isLoading}>
              {t("navigation.actions.createMenu")}
            </Button>
          </Drawer.Footer>
        </form>
      </Drawer.Content>
    </Drawer>
  )
}
