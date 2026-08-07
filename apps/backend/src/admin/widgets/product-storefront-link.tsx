import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { HttpTypes } from "@medusajs/types"
import { useTranslation } from "react-i18next"
import StorefrontLinkWidget from "../components/storefront-link-widget"

type ProductWidgetProps = {
  data: HttpTypes.AdminProduct
}

const ProductStorefrontLinkWidget = ({ data }: ProductWidgetProps) => {
  const { t } = useTranslation()

  return (
    <StorefrontLinkWidget
      title={t("storefrontLink.product.title")}
      hint={t("storefrontLink.product.hint")}
      path={data.handle ? `/san-pham/${data.handle}` : null}
    />
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductStorefrontLinkWidget
