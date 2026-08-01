import { defineWidgetConfig } from "@medusajs/admin-sdk"
import SidebarBadges from "../components/sidebar-badges"

/**
 * Mount sidebar notification badges on core Medusa Admin pages (widget zones
 * do not run on custom extension routes — those use PageLayout instead).
 */
export const config = defineWidgetConfig({
  zone: [
    "order.list.before",
    "order.details.before",
    "product.list.before",
    "product.details.before",
    "customer.list.before",
    "customer.details.before",
    "inventory_item.list.before",
    "reservation.list.before",
    "promotion.list.before",
    "campaign.list.before",
  ],
})

export default SidebarBadges
