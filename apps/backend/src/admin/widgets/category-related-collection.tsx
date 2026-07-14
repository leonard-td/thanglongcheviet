import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { HttpTypes } from "@medusajs/types"
import { Button, Container, Heading, Select, Text, toast } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { sdk } from "../lib/sdk"

type CategoryRelatedCollectionWidgetProps = {
  data: HttpTypes.AdminProductCategory
}

type CollectionOption = { id: string; title: string }

const NO_COLLECTION = "__none__"

/**
 * Lets an admin attach a product collection to a category. The storefront
 * category page shows that collection's products as an auto-scrolling
 * right-hand menu. Persisted on category.metadata.related_collection_id —
 * same pattern as the thumbnail widget.
 */
const CategoryRelatedCollectionWidget = ({
  data,
}: CategoryRelatedCollectionWidgetProps) => {
  const { t } = useTranslation()

  const saved =
    typeof data.metadata?.related_collection_id === "string"
      ? data.metadata.related_collection_id
      : ""
  const [collectionId, setCollectionId] = useState(saved)
  const [isSaving, setIsSaving] = useState(false)

  const { data: collectionsData } = useQuery<{
    collections: CollectionOption[]
  }>({
    queryFn: () =>
      sdk.client.fetch("/admin/collections", {
        query: { limit: 100, fields: "id,title" },
      }),
    queryKey: [["collections", "category-widget-options"]],
  })

  const collections = collectionsData?.collections ?? []

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await sdk.admin.productCategory.update(data.id, {
        metadata: {
          ...(data.metadata ?? {}),
          related_collection_id: collectionId || null,
        },
      })
      toast.success(t("relatedCollection.saved"))
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("relatedCollection.saveFailed")
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-y-4 px-6 py-4">
        <div>
          <Heading level="h2">{t("relatedCollection.title")}</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            {t("relatedCollection.hint")}
          </Text>
        </div>
        <Select
          value={collectionId || NO_COLLECTION}
          onValueChange={(value) =>
            setCollectionId(value === NO_COLLECTION ? "" : value)
          }
        >
          <Select.Trigger>
            <Select.Value placeholder={t("relatedCollection.placeholder")} />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value={NO_COLLECTION}>
              {t("relatedCollection.none")}
            </Select.Item>
            {collections.map((collection) => (
              <Select.Item key={collection.id} value={collection.id}>
                {collection.title}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
        <div className="flex justify-end">
          <Button
            size="small"
            variant="secondary"
            isLoading={isSaving}
            disabled={collectionId === saved}
            onClick={handleSave}
          >
            {t("relatedCollection.save")}
          </Button>
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product_category.details.side.after",
})

export default CategoryRelatedCollectionWidget
