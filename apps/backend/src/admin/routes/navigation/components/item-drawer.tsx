import { Button, Checkbox, Drawer, Input, Label, Select, Text, clx } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import ImagePicker from "../../../components/image-picker"
import { NAV_ICON_KEYS, NavIconPreview } from "../nav-icons"
import type { ItemFormState } from "../tree-utils"

type ItemDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: ItemFormState
  isLoading: boolean
  /** Thumbnail auto-matched from the current url, shown as a fallback hint. */
  resolvedThumbnail?: string | null
  onChange: (next: ItemFormState) => void
  onSubmit: (event: React.FormEvent) => void
}

export const ItemDrawer = ({
  open,
  onOpenChange,
  form,
  isLoading,
  resolvedThumbnail,
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
          <Drawer.Body className="flex flex-col gap-y-4 overflow-y-auto">
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
            <div className="flex flex-col gap-y-2">
              <Label>{t("navigation.fields.thumbnail")}</Label>
              <ImagePicker
                value={form.thumbnail || resolvedThumbnail || ""}
                onChange={(url) => onChange({ ...form, thumbnail: url })}
              />
              <Text size="xsmall" className="text-ui-fg-subtle">
                {!form.thumbnail && resolvedThumbnail
                  ? t("navigation.fields.thumbnailAutoHint")
                  : t("navigation.fields.thumbnailHint")}
              </Text>
            </div>
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="item_display_mode">
                {t("navigation.fields.displayMode")}
              </Label>
              <Select
                value={form.display_mode}
                onValueChange={(value) =>
                  onChange({
                    ...form,
                    display_mode: value as ItemFormState["display_mode"],
                  })
                }
              >
                <Select.Trigger id="item_display_mode">
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="none">
                    {t("navigation.fields.displayModeNone")}
                  </Select.Item>
                  <Select.Item value="icon">
                    {t("navigation.fields.displayModeIcon")}
                  </Select.Item>
                  <Select.Item value="image">
                    {t("navigation.fields.displayModeImage")}
                  </Select.Item>
                </Select.Content>
              </Select>
              <Text size="xsmall" className="text-ui-fg-subtle">
                {t("navigation.fields.displayModeHint")}
              </Text>
            </div>
            {form.display_mode === "icon" && (
              <div className="flex flex-col gap-y-2">
                <Label>{t("navigation.fields.icon")}</Label>
                <div className="grid grid-cols-6 gap-2">
                  {NAV_ICON_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      title={t(`navigation.icons.${key}`)}
                      className={clx(
                        "flex items-center justify-center rounded border p-2 text-ui-fg-subtle transition-colors hover:bg-ui-bg-subtle-hover",
                        form.icon === key
                          ? "border-ui-border-interactive bg-ui-bg-subtle-hover text-ui-fg-base"
                          : "border-ui-border-base"
                      )}
                      onClick={() => onChange({ ...form, icon: key })}
                    >
                      <NavIconPreview name={key} className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>
            )}
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
