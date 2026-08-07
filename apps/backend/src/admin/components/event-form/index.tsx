import {
  Button,
  Copy,
  Heading,
  Input,
  Label,
  Select,
  Switch,
  Text,
  Textarea,
} from "@medusajs/ui"
import type { JSONContent } from "@tiptap/core"
import { useQuery } from "@tanstack/react-query"
import TiptapEditor from "../tiptap-editor"
import ImagePicker from "../image-picker"
import { slugify } from "../../lib/campaign-post"
import { sdk } from "../../lib/sdk"
import { useTranslation } from "react-i18next"
import type { CampaignTopicsResponse } from "../../types/campaign-topic"

const NO_TOPIC = "__none__"

type EventFormProps = {
  title: string
  slug: string
  thumbnail: string
  location: string
  startAt: string
  endAt: string
  capacity: string
  registrationOpen: boolean
  topicId: string
  isActive: boolean
  seoTitle: string
  seoDescription: string
  seoKeywords: string
  content: JSONContent | null
  editorKey?: string
  isSubmitting?: boolean
  submitLabel: string
  formId?: string
  hideSubmit?: boolean
  onTitleChange: (value: string) => void
  onSlugChange: (value: string) => void
  onThumbnailChange: (value: string) => void
  onLocationChange: (value: string) => void
  onStartAtChange: (value: string) => void
  onEndAtChange: (value: string) => void
  onCapacityChange: (value: string) => void
  onRegistrationOpenChange: (value: boolean) => void
  onTopicIdChange: (value: string) => void
  onIsActiveChange: (value: boolean) => void
  onSeoTitleChange: (value: string) => void
  onSeoDescriptionChange: (value: string) => void
  onSeoKeywordsChange: (value: string) => void
  onContentChange: (value: JSONContent) => void
  onSubmit: (event: React.FormEvent) => void
}

const EventForm = ({
  title,
  slug,
  thumbnail,
  location,
  startAt,
  endAt,
  capacity,
  registrationOpen,
  topicId,
  isActive,
  seoTitle,
  seoDescription,
  seoKeywords,
  content,
  editorKey,
  isSubmitting = false,
  submitLabel,
  formId,
  hideSubmit = false,
  onTitleChange,
  onSlugChange,
  onThumbnailChange,
  onLocationChange,
  onStartAtChange,
  onEndAtChange,
  onCapacityChange,
  onRegistrationOpenChange,
  onTopicIdChange,
  onIsActiveChange,
  onSeoTitleChange,
  onSeoDescriptionChange,
  onSeoKeywordsChange,
  onContentChange,
  onSubmit,
}: EventFormProps) => {
  const { t } = useTranslation()

  const { data: topicsData } = useQuery<CampaignTopicsResponse>({
    queryFn: () =>
      sdk.client.fetch("/admin/campaign-topics", {
        query: { limit: 100, content_type: "event" },
      }),
    queryKey: [["campaign-topics", "select-options", "event"]],
  })

  const topics = topicsData?.campaign_topics ?? []

  return (
    <form id={formId} className="flex flex-col gap-6 px-6 py-6" onSubmit={onSubmit}>
      <div className="flex flex-col gap-y-2">
        <Label htmlFor="title">{t("events.fields.title")}</Label>
        <Input
          id="title"
          required
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-y-2">
        <Label htmlFor="slug">{t("events.fields.slug")}</Label>
        <div className="flex items-center gap-x-2">
          <Input
            id="slug"
            required={!!slug}
            placeholder={slugify(title) || t("events.fields.slugPlaceholder")}
            value={slug}
            onChange={(e) => onSlugChange(e.target.value)}
          />
          {(slug || slugify(title)) && (
            <Copy content={`/trai-nghiem/${slug || slugify(title)}`} />
          )}
        </div>
        <span className="text-ui-fg-subtle text-xs">
          {t("events.fields.slugCopyHint")}
        </span>
      </div>

      <div className="flex flex-col gap-y-2">
        <Label>{t("events.fields.topic")}</Label>
        <Select
          value={topicId || NO_TOPIC}
          onValueChange={(value) => onTopicIdChange(value === NO_TOPIC ? "" : value)}
        >
          <Select.Trigger>
            <Select.Value placeholder={t("events.fields.topicPlaceholder")} />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value={NO_TOPIC}>{t("events.fields.noTopic")}</Select.Item>
            {topics.map((topic) => (
              <Select.Item key={topic.id} value={topic.id}>
                {topic.name}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
        <span className="text-ui-fg-subtle text-xs">
          {t("events.fields.topicHint")}
        </span>
      </div>

      <div className="flex flex-col gap-y-2">
        <Label>{t("events.fields.thumbnail")}</Label>
        <ImagePicker value={thumbnail} onChange={onThumbnailChange} />
        <span className="text-ui-fg-subtle text-xs">
          {t("events.fields.thumbnailHint")}
        </span>
      </div>

      <div className="flex flex-col gap-y-2">
        <Label htmlFor="location">{t("events.fields.location")}</Label>
        <Input
          id="location"
          placeholder={t("events.fields.locationPlaceholder")}
          value={location}
          onChange={(e) => onLocationChange(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-y-2">
          <Label htmlFor="start_at">{t("events.fields.startAt")}</Label>
          <Input
            id="start_at"
            type="datetime-local"
            value={startAt}
            onChange={(e) => onStartAtChange(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-y-2">
          <Label htmlFor="end_at">{t("events.fields.endAt")}</Label>
          <Input
            id="end_at"
            type="datetime-local"
            value={endAt}
            onChange={(e) => onEndAtChange(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-y-2">
        <Label htmlFor="capacity">{t("events.fields.capacity")}</Label>
        <Input
          id="capacity"
          type="number"
          min={1}
          placeholder={t("events.fields.capacityPlaceholder")}
          value={capacity}
          onChange={(e) => onCapacityChange(e.target.value)}
        />
        <span className="text-ui-fg-subtle text-xs">
          {t("events.fields.capacityHint")}
        </span>
      </div>

      <div className="flex items-center gap-x-3">
        <Switch
          checked={registrationOpen}
          onCheckedChange={onRegistrationOpenChange}
        />
        <Label>{t("events.fields.registrationOpen")}</Label>
      </div>

      <div className="flex items-center gap-x-3">
        <Switch checked={isActive} onCheckedChange={onIsActiveChange} />
        <Label>{t("events.fields.active")}</Label>
      </div>

      <div className="flex flex-col gap-y-4 rounded-lg border p-4">
        <div>
          <Heading level="h3">{t("events.fields.seoSectionTitle")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("events.fields.seoSectionHint")}
          </Text>
        </div>

        <div className="flex flex-col gap-y-2">
          <Label htmlFor="seo_title">{t("events.fields.seoTitle")}</Label>
          <Input
            id="seo_title"
            placeholder={t("events.fields.seoTitlePlaceholder")}
            value={seoTitle}
            onChange={(e) => onSeoTitleChange(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-y-2">
          <Label htmlFor="seo_description">{t("events.fields.seoDescription")}</Label>
          <Textarea
            id="seo_description"
            rows={3}
            placeholder={t("events.fields.seoDescriptionPlaceholder")}
            value={seoDescription}
            onChange={(e) => onSeoDescriptionChange(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-y-2">
          <Label htmlFor="seo_keywords">{t("events.fields.seoKeywords")}</Label>
          <Input
            id="seo_keywords"
            placeholder={t("events.fields.seoKeywordsPlaceholder")}
            value={seoKeywords}
            onChange={(e) => onSeoKeywordsChange(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-y-2 overflow-visible">
        <Label>{t("events.fields.content")}</Label>
        <TiptapEditor
          editorKey={editorKey}
          value={content}
          onChange={onContentChange}
        />
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

export default EventForm
