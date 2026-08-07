import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { HttpTypes } from "@medusajs/types"
import { Button, Container, Heading, Select, Text, toast } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { sdk } from "../lib/sdk"
import type { CampaignTopicsResponse } from "../types/campaign-topic"

type ProductTopicLinkWidgetProps = {
  data: HttpTypes.AdminProduct
}

const NO_TOPIC = "__none__"

/**
 * Lets an admin attach a "sản phẩm" campaign_topic to a product, so it shows
 * up on that topic's storefront listing page (/san-pham/chu-de/<slug>).
 * Persisted on product.metadata.topic_id — same pattern as
 * category.metadata.related_collection_id (see category-related-collection.tsx).
 */
const ProductTopicLinkWidget = ({ data }: ProductTopicLinkWidgetProps) => {
  const { t } = useTranslation()

  const saved =
    typeof data.metadata?.topic_id === "string" ? data.metadata.topic_id : ""
  const [topicId, setTopicId] = useState(saved)
  const [isSaving, setIsSaving] = useState(false)

  const { data: topicsData } = useQuery<CampaignTopicsResponse>({
    queryFn: () =>
      sdk.client.fetch("/admin/campaign-topics", {
        query: { limit: 100, content_type: "product" },
      }),
    queryKey: [["campaign-topics", "product-widget-options"]],
  })

  const topics = topicsData?.campaign_topics ?? []

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await sdk.admin.product.update(data.id, {
        metadata: {
          ...(data.metadata ?? {}),
          topic_id: topicId || null,
        },
      })
      toast.success(t("productTopicLink.saved"))
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("productTopicLink.saveFailed")
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-y-4 px-6 py-4">
        <div>
          <Heading level="h2">{t("productTopicLink.title")}</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            {t("productTopicLink.hint")}
          </Text>
        </div>
        <Select
          value={topicId || NO_TOPIC}
          onValueChange={(value) => setTopicId(value === NO_TOPIC ? "" : value)}
        >
          <Select.Trigger>
            <Select.Value placeholder={t("productTopicLink.placeholder")} />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value={NO_TOPIC}>{t("productTopicLink.none")}</Select.Item>
            {topics.map((topic) => (
              <Select.Item key={topic.id} value={topic.id}>
                {topic.name}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
        <div className="flex justify-end">
          <Button
            size="small"
            variant="secondary"
            isLoading={isSaving}
            disabled={topicId === saved}
            onClick={handleSave}
          >
            {t("productTopicLink.save")}
          </Button>
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductTopicLinkWidget
