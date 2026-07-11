/**
 * Soạn nội dung tin nhắn (plain text) gửi tới Zalo OA / Telegram.
 * Nội dung tin cho đội vận hành nên viết tiếng Việt cố định — không thuộc
 * phạm vi i18n của admin UI.
 */

type OrderLike = {
  display_id?: number | string | null
  email?: string | null
  currency_code?: string | null
  total?: unknown
  items?: Array<{
    title?: string | null
    quantity?: number | null
  } | null> | null
  shipping_address?: {
    first_name?: string | null
    last_name?: string | null
    phone?: string | null
    address_1?: string | null
    city?: string | null
  } | null
}

type InquiryLike = {
  name?: string | null
  phone?: string | null
  email?: string | null
  service?: string | null
  message?: string | null
  source?: string | null
}

function formatAmount(amount: unknown, currency?: string | null): string {
  const value = Number(amount)

  if (!Number.isFinite(value)) {
    return String(amount ?? "")
  }

  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: (currency || "vnd").toUpperCase(),
    }).format(value)
  } catch {
    return `${value} ${currency ?? ""}`.trim()
  }
}

export function formatOrderMessage(order: OrderLike): string {
  const address = order.shipping_address
  const customerName = [address?.first_name, address?.last_name]
    .filter(Boolean)
    .join(" ")

  const items = (order.items ?? [])
    .filter((item): item is NonNullable<typeof item> => !!item)
    .map((item) => `• ${item.title ?? "?"} x${item.quantity ?? 1}`)

  const lines = [
    `🛒 Đơn hàng mới #${order.display_id ?? ""}`.trim(),
    customerName ? `Khách hàng: ${customerName}` : null,
    address?.phone ? `SĐT: ${address.phone}` : null,
    order.email ? `Email: ${order.email}` : null,
    [address?.address_1, address?.city].filter(Boolean).length
      ? `Địa chỉ: ${[address?.address_1, address?.city].filter(Boolean).join(", ")}`
      : null,
    items.length ? "" : null,
    ...items,
    "",
    `Tổng tiền: ${formatAmount(order.total, order.currency_code)}`,
  ]

  return lines.filter((line) => line !== null).join("\n")
}

export function formatInquiryMessage(inquiry: InquiryLike): string {
  const lines = [
    "📩 Khách hàng liên hệ mới",
    inquiry.name ? `Tên: ${inquiry.name}` : null,
    inquiry.phone ? `SĐT: ${inquiry.phone}` : null,
    inquiry.email ? `Email: ${inquiry.email}` : null,
    inquiry.service ? `Dịch vụ quan tâm: ${inquiry.service}` : null,
    inquiry.message ? `Lời nhắn: ${inquiry.message}` : null,
    inquiry.source ? `Nguồn: ${inquiry.source}` : null,
  ]

  return lines.filter((line) => line !== null).join("\n")
}
