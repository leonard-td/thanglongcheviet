import { defineWidgetConfig } from "@medusajs/admin-sdk"
import LanguageSwitcher from "../components/language-switcher"

/**
 * Mount bộ chuyển ngôn ngữ trên các trang CORE của Medusa Admin.
 *
 * Widget zone chỉ tồn tại trên các trang lõi (orders, products...), nên mỗi
 * trang lõi được đăng ký zone `.before` tương ứng — mỗi trang chỉ khớp đúng
 * một zone (một trang hoặc là list, hoặc là details) nên nút không bị nhân
 * đôi. Trang mặc định của admin là danh sách đơn hàng (`order.list.before`).
 *
 * Các trang CUSTOM ROUTE (cards, campaign-posts, media...) KHÔNG có widget
 * zone — chúng phải tự render `<LanguageSwitcher />` từ
 * `src/admin/components/language-switcher` trong page component.
 */
export const config = defineWidgetConfig({
  zone: [
    "login.before",
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
    "role.list.before",
    "role.details.before",
    "policy.list.before",
    "policy.details.before",
  ],
})

export default LanguageSwitcher
