import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { SquareTwoStack } from "@medusajs/icons"
import { Button, Container, Heading, Text, toast } from "@medusajs/ui"
import type { HttpTypes } from "@medusajs/types"
import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { sdk } from "../lib/sdk"

type ProductWidgetProps = {
  data: HttpTypes.AdminProduct
}

const ProductDuplicateWidget = ({ data }: ProductWidgetProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { mutate: duplicateProduct, isPending } = useMutation({
    mutationFn: () =>
      sdk.client.fetch<{ product: HttpTypes.AdminProduct }>(
        `/admin/products/${data.id}/duplicate`,
        { method: "POST" }
      ),
    onSuccess: ({ product }) => {
      toast.success(t("productDuplicate.messages.success"))
      navigate(`/products/${product.id}`)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : t("productDuplicate.messages.failed")
      )
    },
  })

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("productDuplicate.title")}</Heading>
      </div>
      <div className="flex flex-col gap-y-3 px-6 py-4">
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          {t("productDuplicate.hint")}
        </Text>
        <Button
          size="small"
          variant="secondary"
          isLoading={isPending}
          onClick={() => duplicateProduct()}
        >
          <SquareTwoStack />
          {t("productDuplicate.action")}
        </Button>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductDuplicateWidget
