import { Button, Checkbox, Drawer, Input, Label } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type { ItemFormState } from "../tree-utils"

type ItemDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: ItemFormState
  isLoading: boolean
  onChange: (next: ItemFormState) => void
  onSubmit: (event: React.FormEvent) => void
}

export const ItemDrawer = ({
  open,
  onOpenChange,
  form,
  isLoading,
  onChange,
  onSubmit,
}: ItemDrawerProps) => {
  const { t } = useTranslation()

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>
            {form.id
              ? t("navigation.actions.edit")
              : form.parent_id
                ? t("navigation.actions.addChild")
                : t("navigation.actions.addRoot")}
          </Drawer.Title>
        </Drawer.Header>
        <form onSubmit={onSubmit}>
          <Drawer.Body className="flex flex-col gap-y-4">
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="item_label">{t("navigation.fields.label")}</Label>
              <Input
                id="item_label"
                required
                value={form.label}
                onChange={(e) =>
                  onChange({ ...form, label: e.target.value })
                }
              />
            </div>
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="item_url">{t("navigation.fields.url")}</Label>
              <Input
                id="item_url"
                required
                value={form.url}
                onChange={(e) => onChange({ ...form, url: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-x-2 text-sm">
              <Checkbox
                checked={form.openInNewTab}
                onCheckedChange={(v) =>
                  onChange({ ...form, openInNewTab: v === true })
                }
              />
              {t("navigation.fields.openInNewTab")}
            </label>
            <label className="flex items-center gap-x-2 text-sm">
              <Checkbox
                checked={form.is_active}
                onCheckedChange={(v) =>
                  onChange({ ...form, is_active: v === true })
                }
              />
              {t("navigation.fields.isActive")}
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
              {t("navigation.actions.save")}
            </Button>
          </Drawer.Footer>
        </form>
      </Drawer.Content>
    </Drawer>
  )
}
