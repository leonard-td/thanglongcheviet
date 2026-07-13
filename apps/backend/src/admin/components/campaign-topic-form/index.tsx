import {
  Button,
  Copy,
  Input,
  Label,
  Switch,
  Textarea,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import ImagePicker from "../image-picker"
import { slugify } from "../../lib/campaign-post"

type CampaignTopicFormProps = {
  name: string
  slug: string
  description: string
  image: string
  isActive: boolean
  rank: number
  isSubmitting?: boolean
  submitLabel: string
  formId?: string
  hideSubmit?: boolean
  onNameChange: (value: string) => void
  onSlugChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onImageChange: (value: string) => void
  onIsActiveChange: (value: boolean) => void
  onRankChange: (value: number) => void
  onSubmit: (event: React.FormEvent) => void
}

const CampaignTopicForm = ({
  name,
  slug,
  description,
  image,
  isActive,
  rank,
  isSubmitting = false,
  submitLabel,
  formId,
  hideSubmit = false,
  onNameChange,
  onSlugChange,
  onDescriptionChange,
  onImageChange,
  onIsActiveChange,
  onRankChange,
  onSubmit,
}: CampaignTopicFormProps) => {
  const { t } = useTranslation()

  return (
    <form id={formId} className="flex flex-col gap-6 px-6 py-6" onSubmit={onSubmit}>
      <div className="flex flex-col gap-y-2">
        <Label htmlFor="topic-name">{t("campaign-topics.fields.name")}</Label>
        <Input
          id="topic-name"
          required
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-y-2">
        <Label htmlFor="topic-slug">{t("campaign-topics.fields.slug")}</Label>
        <div className="flex items-center gap-x-2">
          <Input
            id="topic-slug"
            placeholder={slugify(name) || t("campaign-topics.fields.slugPlaceholder")}
            value={slug}
            onChange={(e) => onSlugChange(e.target.value)}
          />
          {(slug || slugify(name)) && (
            <Copy content={`/tin-tuc/chu-de/${slug || slugify(name)}`} />
          )}
        </div>
        <span className="text-ui-fg-subtle text-xs">
          {t("campaign-topics.fields.slugCopyHint")}
        </span>
      </div>

      <div className="flex flex-col gap-y-2">
        <Label htmlFor="topic-description">
          {t("campaign-topics.fields.description")}
        </Label>
        <Textarea
          id="topic-description"
          rows={3}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-y-2">
        <Label>{t("campaign-topics.fields.image")}</Label>
        <ImagePicker value={image} onChange={onImageChange} />
        <span className="text-ui-fg-subtle text-xs">
          {t("campaign-topics.fields.imageHint")}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-y-2">
          <Label htmlFor="topic-rank">{t("campaign-topics.fields.rank")}</Label>
          <Input
            id="topic-rank"
            type="number"
            value={rank}
            onChange={(e) => onRankChange(Number(e.target.value) || 0)}
          />
        </div>
        <div className="flex items-end gap-x-3 pb-2">
          <Switch checked={isActive} onCheckedChange={onIsActiveChange} />
          <Label>{t("campaign-topics.fields.active")}</Label>
        </div>
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

export default CampaignTopicForm
