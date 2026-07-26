import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Text, toast } from "@medusajs/ui"
import type { HttpTypes } from "@medusajs/types"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import HtmlTiptapEditor from "../components/html-tiptap-editor"
import { sdk } from "../lib/sdk"

type ProductWidgetProps = {
  data: HttpTypes.AdminProduct
}

const HIDE_STYLE_ID = "tlcv-hide-native-product-description"

const WIDGET_ATTR = "data-tlcv-product-description-widget"

const hideNativeDescriptionField = () => {
  const widgetRoot = document.querySelector(`[${WIDGET_ATTR}="true"]`)

  const candidates = Array.from(
    document.querySelectorAll("label, p, span, div, dt"),
  )

  for (const node of candidates) {
    if (widgetRoot?.contains(node)) {
      continue
    }

    const text = node.textContent?.trim()
    if (text !== "Description" && text !== "Mô tả") {
      continue
    }

    const wrapper =
      node.closest('[class*="grid"]')
      ?? node.closest('[class*="flex-col"]')
      ?? node.parentElement

    if (wrapper instanceof HTMLElement) {
      wrapper.style.display = "none"
      wrapper.setAttribute("data-tlcv-hidden-description", "true")
    }
  }
}

const ProductDescriptionEditorWidget = ({ data }: ProductWidgetProps) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [description, setDescription] = useState(data.description ?? "")
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setDescription(data.description ?? "")
    setDirty(false)
  }, [data.id, data.description])

  useEffect(() => {
    if (!document.getElementById(HIDE_STYLE_ID)) {
      const style = document.createElement("style")
      style.id = HIDE_STYLE_ID
      style.textContent = `
        [data-tlcv-hidden-description="true"] {
          display: none !important;
        }
      `
      document.head.appendChild(style)
    }

    hideNativeDescriptionField()

    const observer = new MutationObserver(() => {
      hideNativeDescriptionField()
    })
    observer.observe(document.body, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [data.id])

  const { mutate: saveDescription, isPending } = useMutation({
    mutationFn: (html: string) =>
      sdk.admin.product.update(data.id, {
        description: html || null,
      }),
    onSuccess: () => {
      toast.success(t("productDescription.messages.saved"))
      queryClient.invalidateQueries({ queryKey: [["product", data.id]] })
      queryClient.invalidateQueries({ queryKey: [["products"]] })
      setDirty(false)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : t("productDescription.messages.failed"),
      )
    },
  })

  return (
    <div {...{ [WIDGET_ATTR]: "true" }}>
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
          variant="primary"
          disabled={!dirty}
          isLoading={isPending}
          onClick={() => saveDescription(description)}
        >
          {t("productDescription.save")}
        </Button>
      </div>
      <div className="px-6 py-4 overflow-visible">
        <HtmlTiptapEditor
          editorKey={data.id}
          value={description}
          placeholder={t("productDescription.placeholder")}
          onChange={(html) => {
            setDescription(html)
            setDirty(true)
          }}
        />
      </div>
    </Container>
    </div>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.before",
})

export default ProductDescriptionEditorWidget
