import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { CARE_CHANNEL_MODULE } from "../modules/care-channel"
import type CareChannelModuleService from "../modules/care-channel/service"
import { formatOrderMessage } from "../modules/care-channel/utils/format"

/**
 * Khi có đơn hàng mới → gửi thông báo tới mọi kênh chăm sóc bán hàng
 * (care_channel có notify_orders = true) đã tích hợp: Zalo OA, Telegram...
 */
export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const careService: CareChannelModuleService = container.resolve(
    CARE_CHANNEL_MODULE
  )

  const {
    data: [order],
  } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "email",
      "currency_code",
      "total",
      "items.title",
      "items.quantity",
      "shipping_address.first_name",
      "shipping_address.last_name",
      "shipping_address.phone",
      "shipping_address.address_1",
      "shipping_address.city",
    ],
    filters: { id: data.id },
  })

  if (!order) {
    return
  }

  try {
    const results = await careService.notifyOrderChannels(
      formatOrderMessage(order)
    )
    const failed = results.filter((message) => message.status === "failed")

    if (failed.length) {
      logger.warn(
        `care-channel: ${failed.length}/${results.length} order notification(s) failed for order ${data.id}`
      )
    }
  } catch (error) {
    logger.error(
      `care-channel: failed to notify order ${data.id}: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
