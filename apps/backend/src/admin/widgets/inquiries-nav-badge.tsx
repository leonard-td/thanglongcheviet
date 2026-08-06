import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useInquiriesNavBadge, useInquiriesNewCount } from "../hooks/use-inquiries-nav-badge"

/**
 * Shows a red badge on the "Customer Inquiries" sidebar item when new
 * storefront submissions arrive. Runs on core admin pages (widget zones).
 */
const InquiriesNavBadgeWidget = () => {
  const { data } = useInquiriesNewCount()
  useInquiriesNavBadge(data?.new_count ?? 0)
  return null
}

export const config = defineWidgetConfig({
  zone: [
    "order.list.before",
    "order.details.before",
    "product.list.before",
    "product.details.before",
    "customer.list.before",
    "customer.details.before",
    "promotion.list.before",
    "campaign.list.before",
    "inventory_item.list.before",
    "reservation.list.before",
    "price_list.list.before",
    "draft_order.list.before",
  ],
})

export default InquiriesNavBadgeWidget
