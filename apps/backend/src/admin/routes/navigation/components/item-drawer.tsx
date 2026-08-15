import { Button, Checkbox, Drawer, Input, Label, Select, Text, clx } from "@medusajs/ui"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import ImagePicker from "../../../components/image-picker"
import { isIconImageUrl, LUCIDE_ICON_NAMES, LucideDynamicIcon, NAV_ICON_KEYS, NavIconOrImagePreview, NavIconPreview } from "../nav-icons"
import type { ItemFormState } from "../tree-utils"

const LUCIDE_SEARCH_RESULT_LIMIT = 48

type IconOption = {
  key: string
  label: string
  Preview: (props: { name: string; className?: string }) => JSX.Element | null
}

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
  const [iconQuery, setIconQuery] = useState("")

  const iconResults = useMemo<IconOption[]>(() => {
    const query = iconQuery.trim().toLowerCase()

    const legacyMatches = NAV_ICON_KEYS.filter((key) => {
      if (!query) return true
      const label = t(`navigation.icons.${key}`)
      return key.includes(query) || label.toLowerCase().includes(query)
    }).map((key) => ({ key, label: t(`navigation.icons.${key}`), Preview: NavIconPreview }))

    if (!query) return legacyMatches

    const lucideMatches = LUCIDE_ICON_NAMES.filter((name) =>
      name.toLowerCase().includes(query)
    )
      .slice(0, LUCIDE_SEARCH_RESULT_LIMIT)
      .map((name) => ({ key: name, label: name, Preview: LucideDynamicIcon }))

    return [...legacyMatches, ...lucideMatches]
  }, [iconQuery, t])

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
        <form onSubmit={onSubmit} className="flex flex-1 flex-col overflow-hidden">
          <Drawer.Body className="flex flex-1 flex-col gap-y-4 overflow-y-auto">
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
                <Label className="flex items-center gap-x-1.5">
                  {t("navigation.fields.icon")}
                  {form.icon && (
                    <>
                      <NavIconOrImagePreview name={form.icon} className="h-3.5 w-3.5" />
                      <span className="font-normal text-ui-fg-subtle">— {form.icon}</span>
                    </>
                  )}
                </Label>
                <Input
                  type="text"
                  value={iconQuery}
                  placeholder={t("navigation.fields.iconSearchPlaceholder")}
                  onChange={(e) => setIconQuery(e.target.value)}
                />
                <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto">
                  {iconResults.map(({ key, label, Preview }) => (
                    <button
                      key={key}
                      type="button"
                      title={label}
                      className={clx(
                        "flex items-center justify-center rounded border p-2 text-ui-fg-subtle transition-colors hover:bg-ui-bg-subtle-hover",
                        form.icon === key
                          ? "border-ui-border-interactive bg-ui-bg-subtle-hover text-ui-fg-base"
                          : "border-ui-border-base"
                      )}
                      onClick={() => onChange({ ...form, icon: key })}
                    >
                      <Preview name={key} className="h-4 w-4" />
                    </button>
                  ))}
                  {iconResults.length === 0 && (
                    <Text size="xsmall" className="col-span-6 text-ui-fg-muted">
                      {t("navigation.fields.iconNoResults")}
                    </Text>
                  )}
                </div>
                <Text size="xsmall" className="text-ui-fg-subtle">
                  {t("navigation.fields.iconSearchHint")}
                </Text>

                <div className="flex flex-col gap-y-2 border-t border-ui-border-base pt-3 mt-1">
                  <Text size="small" weight="plus">
                    {t("navigation.fields.iconCustomImage")}
                  </Text>
                  <ImagePicker
                    value={form.icon && isIconImageUrl(form.icon) ? form.icon : ""}
                    onChange={(url) => onChange({ ...form, icon: url })}
                  />
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    {t("navigation.fields.iconCustomImageHint")}
                  </Text>
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
