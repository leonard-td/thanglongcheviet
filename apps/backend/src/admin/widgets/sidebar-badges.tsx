import { defineWidgetConfig } from "@medusajs/admin-sdk"
import SidebarBadges from "../components/sidebar-badges"

/**
 * Mount sidebar notification badges on core Medusa Admin pages (widget zones
 * do not run on custom extension routes — those use PageLayout instead).
 *
 * Zones mirror language-switcher.tsx so polling keeps running on almost every
 * core page, not only Orders/Products.
 */
export const config = defineWidgetConfig({
  zone: [
    "order.list.before",
    "order.details.before",
    "draft_order.list.before",
    "draft_order.details.before",
    "product.list.before",
    "product.details.before",
    "product_variant.details.before",
    "product_collection.list.before",
    "product_collection.details.before",
    "product_category.list.before",
    "product_category.details.before",
    "customer.list.before",
    "customer.details.before",
    "customer_group.list.before",
    "customer_group.details.before",
    "inventory_item.list.before",
    "inventory_item.details.before",
    "reservation.list.before",
    "reservation.details.before",
    "price_list.list.before",
    "price_list.details.before",
    "promotion.list.before",
    "promotion.details.before",
    "campaign.list.before",
    "campaign.details.before",
  ],
})

export default SidebarBadges
