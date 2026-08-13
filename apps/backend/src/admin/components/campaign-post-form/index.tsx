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
import { useState } from "react"
import TiptapEditor from "../tiptap-editor"
import ImagePicker from "../image-picker"
import { slugify } from "../../lib/campaign-post"
import { sdk } from "../../lib/sdk"
import { useTranslation } from "react-i18next"
import type { CampaignTopicsResponse } from "../../types/campaign-topic"
import type {
  CampaignPostLocale,
  CampaignPostTranslations,
} from "../../types/campaign-post"

const NO_TOPIC = "__none__"

type CampaignPostFormProps = {
  slug: string
  thumbnail: string
  topicId: string
  isActive: boolean
  publishAt: string
  unpublishAt: string
  translations: CampaignPostTranslations
  editorKey?: string
  isSubmitting?: boolean
  submitLabel: string
  formId?: string
  hideSubmit?: boolean
  onSlugChange: (value: string) => void
  onThumbnailChange: (value: string) => void
  onTopicIdChange: (value: string) => void
  onIsActiveChange: (value: boolean) => void
  onPublishAtChange: (value: string) => void
  onUnpublishAtChange: (value: string) => void
  onTranslationsChange: (value: CampaignPostTranslations) => void
  onSubmit: (event: React.FormEvent) => void
}

const CampaignPostForm = ({
  slug,
  thumbnail,
  topicId,
  isActive,
  publishAt,
  unpublishAt,
  translations,
  editorKey,
  isSubmitting = false,
  submitLabel,
  formId,
  hideSubmit = false,
  onSlugChange,
  onThumbnailChange,
  onTopicIdChange,
  onIsActiveChange,
  onPublishAtChange,
  onUnpublishAtChange,
  onTranslationsChange,
  onSubmit,
}: CampaignPostFormProps) => {
  const { t } = useTranslation()
  const [activeLocale, setActiveLocale] = useState<CampaignPostLocale>("vi")
  const translation = translations[activeLocale] ?? {}
  const vietnameseTitle = translations.vi?.title ?? ""

  const updateTranslation = (
    field: keyof NonNullable<CampaignPostTranslations[CampaignPostLocale]>,
    value: string | JSONContent | null
  ) => {
    onTranslationsChange({
      ...translations,
      [activeLocale]: {
        ...translation,
        [field]: value,
      },
    })
  }

  const { data: topicsData } = useQuery<CampaignTopicsResponse>({
    queryFn: () =>
      sdk.client.fetch("/admin/campaign-topics", {
        query: { limit: 100, content_type: "post" },
      }),
    queryKey: [["campaign-topics", "select-options", "post"]],
  })

  const topics = topicsData?.campaign_topics ?? []

  return (
    <form id={formId} className="flex flex-col gap-6 px-6 py-6" onSubmit={onSubmit}>
      <div className="flex flex-col gap-y-2">
        <Label>{t("campaign-posts.fields.contentLanguage")}</Label>
        <div className="flex gap-x-2" role="tablist">
          {(["vi", "en"] as const).map((locale) => (
            <Button
              key={locale}
              type="button"
              variant={activeLocale === locale ? "primary" : "secondary"}
              role="tab"
              aria-selected={activeLocale === locale}
              onClick={() => setActiveLocale(locale)}
            >
              {t(`campaign-posts.fields.language.${locale}`)}
            </Button>
          ))}
        </div>
        <Text size="small" className="text-ui-fg-subtle">
          {t("campaign-posts.fields.contentLanguageHint")}
        </Text>
      </div>

      <div className="flex flex-col gap-y-2">
        <Label htmlFor="title">{t("campaign-posts.fields.title")}</Label>
        <Input
          id="title"
          required={activeLocale === "vi"}
          value={translation.title ?? ""}
          onChange={(e) => updateTranslation("title", e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-y-2">
        <Label htmlFor="slug">{t("campaign-posts.fields.slug")}</Label>
        <div className="flex items-center gap-x-2">
          <Input
            id="slug"
            required={!!slug}
            placeholder={slugify(vietnameseTitle) || t("campaign-posts.fields.slugPlaceholder")}
            value={slug}
            onChange={(e) => onSlugChange(e.target.value)}
          />
          {(slug || slugify(vietnameseTitle)) && (
            <Copy content={`/tin-tuc/${slug || slugify(vietnameseTitle)}`} />
          )}
        </div>
        <span className="text-ui-fg-subtle text-xs">
          {t("campaign-posts.fields.slugCopyHint")}
        </span>
      </div>

      <div className="flex flex-col gap-y-2">
        <Label htmlFor="description">{t("campaign-posts.fields.description")}</Label>
        <Textarea
          id="description"
          rows={3}
          placeholder={t("campaign-posts.fields.descriptionPlaceholder")}
          value={translation.description ?? ""}
          onChange={(e) => updateTranslation("description", e.target.value)}
        />
        <span className="text-ui-fg-subtle text-xs">
          {t("campaign-posts.fields.descriptionHint")}
        </span>
      </div>

      <div className="flex flex-col gap-y-2">
        <Label>{t("campaign-posts.fields.topic")}</Label>
        <Select
          value={topicId || NO_TOPIC}
          onValueChange={(value) =>
            onTopicIdChange(value === NO_TOPIC ? "" : value)
          }
        >
          <Select.Trigger>
            <Select.Value placeholder={t("campaign-posts.fields.topicPlaceholder")} />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value={NO_TOPIC}>
              {t("campaign-posts.fields.noTopic")}
            </Select.Item>
            {topics.map((topic) => (
              <Select.Item key={topic.id} value={topic.id}>
                {topic.name}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
      </div>

      <div className="flex flex-col gap-y-2">
        <Label>{t("campaign-posts.fields.thumbnail")}</Label>
        <ImagePicker value={thumbnail} onChange={onThumbnailChange} />
        <span className="text-ui-fg-subtle text-xs">
          {t("campaign-posts.fields.thumbnailHint")}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-y-2">
          <Label htmlFor="publish_at">{t("campaign-posts.fields.publishAt")}</Label>
          <Input
            id="publish_at"
            type="datetime-local"
            value={publishAt}
            onChange={(e) => onPublishAtChange(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-y-2">
          <Label htmlFor="unpublish_at">{t("campaign-posts.fields.unpublishAt")}</Label>
          <Input
            id="unpublish_at"
            type="datetime-local"
            value={unpublishAt}
            onChange={(e) => onUnpublishAtChange(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-x-3">
        <Switch checked={isActive} onCheckedChange={onIsActiveChange} />
        <Label>{t("campaign-posts.fields.active")}</Label>
      </div>

      <div className="flex flex-col gap-y-2">
        <Label htmlFor="source">{t("campaign-posts.fields.source")}</Label>
        <Input
          id="source"
          value={translation.source ?? ""}
          onChange={(e) => updateTranslation("source", e.target.value)}
        />
        <span className="text-ui-fg-subtle text-xs">
          {t("campaign-posts.fields.sourceHint")}
        </span>
      </div>

      <div className="flex flex-col gap-y-4 rounded-lg border p-4">
        <div>
          <Heading level="h3">{t("campaign-posts.fields.seoSectionTitle")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("campaign-posts.fields.seoSectionHint")}
          </Text>
        </div>

        <div className="flex flex-col gap-y-2">
          <Label htmlFor="seo_title">{t("campaign-posts.fields.seoTitle")}</Label>
          <Input
            id="seo_title"
            placeholder={t("campaign-posts.fields.seoTitlePlaceholder")}
            value={translation.seo_title ?? ""}
            onChange={(e) => updateTranslation("seo_title", e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-y-2">
          <Label htmlFor="seo_description">{t("campaign-posts.fields.seoDescription")}</Label>
          <Textarea
            id="seo_description"
            rows={3}
            placeholder={t("campaign-posts.fields.seoDescriptionPlaceholder")}
            value={translation.seo_description ?? ""}
            onChange={(e) => updateTranslation("seo_description", e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-y-2">
          <Label htmlFor="seo_keywords">{t("campaign-posts.fields.seoKeywords")}</Label>
          <Input
            id="seo_keywords"
            placeholder={t("campaign-posts.fields.seoKeywordsPlaceholder")}
            value={translation.seo_keywords ?? ""}
            onChange={(e) => updateTranslation("seo_keywords", e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-y-2 overflow-visible">
        <Label>{t("campaign-posts.fields.content")}</Label>
        <TiptapEditor
          editorKey={editorKey}
          value={translation.content ?? null}
          onChange={(value) => updateTranslation("content", value)}
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

export default CampaignPostForm
