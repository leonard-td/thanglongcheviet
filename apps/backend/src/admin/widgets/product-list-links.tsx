import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DataTablePaginationState } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import StorefrontLinksTable, {
  type StorefrontLinkRow,
} from "../components/storefront-links-table"
import { sdk } from "../lib/sdk"

const fetchPage = async (
  pagination: DataTablePaginationState
): Promise<{ rows: StorefrontLinkRow[], count: number }> => {
  const res = await sdk.admin.product.list({
    limit: pagination.pageSize,
    offset: pagination.pageIndex * pagination.pageSize,
    fields: "id,title,handle,thumbnail",
  })

  return {
    rows: res.products.map((p) => ({
      id: p.id,
      name: p.title,
      handle: p.handle ?? null,
      thumbnail: p.thumbnail ?? null,
    })),
    count: res.count,
  }
}

const ProductListLinksWidget = () => {
  const { t } = useTranslation()

  return (
    <StorefrontLinksTable
      title={t("storefrontLink.list.productTitle")}
      hint={t("storefrontLink.list.hint")}
      basePath="/san-pham"
      queryKey="product-storefront-links"
      fetchPage={fetchPage}
    />
  )
}

export const config = defineWidgetConfig({
  zone: "product.list.after",
})

export default ProductListLinksWidget
