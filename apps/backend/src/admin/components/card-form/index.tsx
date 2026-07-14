import { Button, Input, Label, Switch, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import ImagePicker from "../image-picker"

type CardFormProps = {
  locked?: boolean
  titleVi: string
  titleEn: string
  image: string
  path: string
  isActive: boolean
  isSubmitting?: boolean
  submitLabel: string
  formId?: string
  hideSubmit?: boolean
  onTitleViChange: (value: string) => void
  onTitleEnChange: (value: string) => void
  onImageChange: (value: string) => void
  onPathChange: (value: string) => void
  onIsActiveChange: (value: boolean) => void
  onSubmit: (event: React.FormEvent) => void
}

const CardForm = ({
  locked = false,
  titleVi,
  titleEn,
  image,
  path,
  isActive,
  isSubmitting = false,
  submitLabel,
  formId,
  hideSubmit = false,
  onTitleViChange,
  onTitleEnChange,
  onImageChange,
  onPathChange,
  onIsActiveChange,
  onSubmit,
}: CardFormProps) => {
  const { t } = useTranslation()

  return (
    <form id={formId} className="flex flex-col gap-6 px-6 py-6" onSubmit={onSubmit}>
      {locked && (
        <Text className="text-ui-fg-subtle rounded-md bg-ui-bg-subtle p-3" size="small">
          {t("cards.lockedNotice")}
        </Text>
      )}

      {!locked && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="title-vi">{t("cards.fields.titleVi")}</Label>
              <Input id="title-vi" required value={titleVi} onChange={(e) => onTitleViChange(e.target.value)} />
            </div>
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="title-en">{t("cards.fields.titleEn")}</Label>
              <Input id="title-en" value={titleEn} onChange={(e) => onTitleEnChange(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-y-2">
            <Label>{t("cards.fields.image")}</Label>
            <ImagePicker value={image} onChange={onImageChange} />
          </div>

          <div className="flex flex-col gap-y-2">
            <Label htmlFor="path">{t("cards.fields.path")}</Label>
            <Input
              id="path"
              placeholder={t("cards.fields.pathPlaceholder")}
              value={path}
              onChange={(e) => onPathChange(e.target.value)}
            />
          </div>
        </>
      )}

      <div className="flex items-center gap-x-3">
        <Switch checked={isActive} onCheckedChange={onIsActiveChange} />
        <Label>{t("cards.fields.active")}</Label>
      </div>

      {!hideSubmit && (
        <div className="flex justify-end">
          <Button isLoading={isSubmitting} type="submit" variant="primary">
            {submitLabel}
          </Button>
        </div>
      )}
    </form>
  )
}

export default CardForm
