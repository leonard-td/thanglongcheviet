import { Button, Input, Label, Select, Switch, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import ImagePicker from "../image-picker"
import { sdk } from "../../lib/sdk"
import { topicPath } from "../../../utils/topic-path"
import type { CampaignTopicContentType } from "../../types/campaign-topic"

type CampaignTopicOption = { id: string; name: string; slug: string; content_type: CampaignTopicContentType }

const NO_TOPIC = "__none__"

type CardFormProps = {
  locked?: boolean
  titleVi: string
  titleEn: string
  image: string
  path: string
  topicId: string
  isActive: boolean
  isSubmitting?: boolean
  submitLabel: string
  formId?: string
  hideSubmit?: boolean
  onTitleViChange: (value: string) => void
  onTitleEnChange: (value: string) => void
  onImageChange: (value: string) => void
  onPathChange: (value: string) => void
  onTopicIdChange: (value: string) => void
  onIsActiveChange: (value: boolean) => void
  onSubmit: (event: React.FormEvent) => void
}

const CardForm = ({
  locked = false,
  titleVi,
  titleEn,
  image,
  path,
  topicId,
  isActive,
  isSubmitting = false,
  submitLabel,
  formId,
  hideSubmit = false,
  onTitleViChange,
  onTitleEnChange,
  onImageChange,
  onPathChange,
  onTopicIdChange,
  onIsActiveChange,
  onSubmit,
}: CardFormProps) => {
  const { t } = useTranslation()

  const { data: topicsData } = useQuery<{ campaign_topics: CampaignTopicOption[] }>({
    queryFn: () =>
      sdk.client.fetch("/admin/campaign-topics", {
        query: { limit: 100 },
      }),
    queryKey: [["campaign-topics", "card-form-options"]],
    enabled: !locked,
  })
  const topics = topicsData?.campaign_topics ?? []

  const handleTopicChange = (value: string) => {
    if (value === NO_TOPIC) {
      onTopicIdChange("")
      return
    }
    onTopicIdChange(value)
    const topic = topics.find((item) => item.id === value)
    if (topic) onPathChange(topicPath(topic))
  }

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
            <Label htmlFor="topic">{t("cards.fields.topic")}</Label>
            <Select value={topicId || NO_TOPIC} onValueChange={handleTopicChange}>
              <Select.Trigger id="topic">
                <Select.Value placeholder={t("cards.fields.topicPlaceholder")} />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value={NO_TOPIC}>{t("cards.fields.noTopic")}</Select.Item>
                {topics.map((topic) => (
                  <Select.Item key={topic.id} value={topic.id}>
                    {topic.name} ({t(`campaign-topics.contentType.${topic.content_type}`)})
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
            <Text className="text-ui-fg-subtle" size="xsmall">
              {t("cards.fields.topicHint")}
            </Text>
          </div>

          <div className="flex flex-col gap-y-2">
            <Label htmlFor="path">{t("cards.fields.path")}</Label>
            <Input
              id="path"
              placeholder={t("cards.fields.pathPlaceholder")}
              value={path}
              onChange={(e) => {
                onPathChange(e.target.value)
                if (topicId) onTopicIdChange("")
              }}
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
