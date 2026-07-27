import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Text, toast } from "@medusajs/ui"
import type { HttpTypes } from "@medusajs/types"
import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import TiptapEditor from "../components/tiptap-editor"
import { sdk } from "../lib/sdk"

type ProductWidgetProps = {
  data: HttpTypes.AdminProduct
}

/**
 * Rich-text product description editor.
 * Saves HTML into Medusa `product.description` (text field). Storefront already
 * renders with v-html — no Nuxt change required.
 *
 * Medusa's built-in Description textarea still appears above; prefer this widget
 * for formatted content (core form fields cannot be removed via widgets).
 */
const ProductDescriptionWidget = ({ data }: ProductWidgetProps) => {
  const { t } = useTranslation()
  const [html, setHtml] = useState<string>(data.description ?? "")
  const [dirty, setDirty] = useState(false)

  const { mutate: saveDescription, isPending } = useMutation({
    mutationFn: (description: string) =>
      sdk.admin.product.update(data.id, { description }),
    onSuccess: () => {
      setDirty(false)
      toast.success(t("productDescription.messages.success"))
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : t("productDescription.messages.failed")
      )
    },
  })

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">{t("productDescription.title")}</Heading>
          <Text size="small" leading="compact" className="text-ui-fg-subtle mt-1">
            {t("productDescription.hint")}
          </Text>
        </div>
        <Button
          size="small"
          variant="secondary"
          disabled={!dirty || isPending}
          isLoading={isPending}
          onClick={() => saveDescription(html)}
        >
          {t("productDescription.save")}
        </Button>
      </div>
      <div className="px-6 py-4">
        <TiptapEditor
          key={data.id}
          editorKey={data.id}
          value={data.description ?? ""}
          output="html"
          onChange={(content) => {
            setHtml(typeof content === "string" ? content : "")
            setDirty(true)
          }}
        />
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductDescriptionWidget
