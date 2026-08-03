import { definePolicies } from "@medusajs/framework/utils"

/**
 * Helper to declare CRUD policies for a resource.
 * Returns the exported definePolicies result for framework registration.
 *
 * Policy `name` is stored in DB and shown in Admin Policies UI (not i18n),
 * so we keep Vietnamese labels to match the rest of the admin experience.
 */
function declareResourcePolicies(
  resource: string,
  label: string,
  operations: string[] = ["read", "create", "update", "delete"],
) {
  const opLabels: Record<string, string> = {
    read: "Xem",
    create: "Tạo",
    update: "Sửa",
    delete: "Xóa",
  }

  return definePolicies(
    operations.map((op) => ({
      name: `${opLabels[op] ?? op} ${label}`,
      resource,
      operation: op,
    })),
  )
}

// Campaign module
export const campaignPostPolicies = declareResourcePolicies(
  "campaign-post",
  "bài viết Campaign",
)
export const campaignTopicPolicies = declareResourcePolicies(
  "campaign-topic",
  "chủ đề bài viết",
)

// Card module
export const cardPolicies = declareResourcePolicies("card", "card trang chủ")

// Event module
export const eventPolicies = declareResourcePolicies("event", "sự kiện")
export const eventRegistrationPolicies = declareResourcePolicies(
  "event-registration",
  "đăng ký sự kiện",
  ["read", "update", "delete"],
)

// Inquiry module
export const inquiryPolicies = declareResourcePolicies(
  "inquiry",
  "liên hệ / đặt lịch",
  ["read", "update"],
)

// Media
export const mediaPolicies = declareResourcePolicies("media", "thư viện ảnh")

// TLCV-only modules
export const navigationPolicies = declareResourcePolicies(
  "navigation",
  "điều hướng",
)
export const careChannelPolicies = declareResourcePolicies(
  "care-channel",
  "kênh CSKH",
)
export const careMessagePolicies = declareResourcePolicies(
  "care-message",
  "tin nhắn CSKH",
  ["read", "create"],
)
export const siteSettingsPolicies = declareResourcePolicies(
  "site-settings",
  "thông tin cửa hàng",
  ["read", "update"],
)
export const backupPolicies = declareResourcePolicies(
  "backup",
  "sao lưu & phục hồi",
)
