import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { HttpTypes } from "@medusajs/types"
import {
  Button,
  Container,
  Heading,
  Label,
  Switch,
  Text,
  toast,
} from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { sdk } from "../lib/sdk"

type ProductFeaturedWidgetProps = {
  data: HttpTypes.AdminProduct
}

/**
 * Marks a product as "featured" so the storefront's promotions carousel shows
 * it. Persisted on product.metadata.featured — same convention as
 * metadata.topic_id (see product-topic-link.tsx).
 */
const ProductFeaturedWidget = ({ data }: ProductFeaturedWidgetProps) => {
  const { t } = useTranslation()

  const saved = data.metadata?.featured === true
  const [featured, setFeatured] = useState(saved)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await sdk.admin.product.update(data.id, {
        metadata: { ...(data.metadata ?? {}), featured },
      })
      toast.success(t("productFeatured.saved"))
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("productFeatured.saveFailed")
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-y-4 px-6 py-4">
        <div>
          <Heading level="h2">{t("productFeatured.title")}</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            {t("productFeatured.hint")}
          </Text>
        </div>
        <div className="flex items-center gap-x-3">
          <Switch
            id="product-featured"
            checked={featured}
            onCheckedChange={setFeatured}
          />
          <Label htmlFor="product-featured" weight="plus">
            {t("productFeatured.label")}
          </Label>
        </div>
        <div className="flex justify-end">
          <Button
            size="small"
            variant="secondary"
            isLoading={isSaving}
            disabled={featured === saved}
            onClick={handleSave}
          >
            {t("productFeatured.save")}
          </Button>
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductFeaturedWidget
