import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { phonesMatch } from "../../utils/phone"
import { enforceStoreRateLimit } from "../../utils/store-rate-limit"

/**
 * GET /store/order-lookup?number=<display_id>&phone=<phone>
 *
 * Guest order tracking: returns an order only when BOTH the order number and
 * the shipping-address phone match, so order numbers alone leak nothing.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  await enforceStoreRateLimit(req, res, {
    name: "order-lookup",
    limit: 20,
    windowMs: 60_000,
  })

  const number = String(req.query.number || "").replace(/\D/g, "")
  const phone = String(req.query.phone || "")

  if (!number || !phone.trim()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "number and phone are required"
    )
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "status",
      "created_at",
      "total",
      "currency_code",
      "email",
      "shipping_address.first_name",
      "shipping_address.last_name",
      "shipping_address.address_1",
      "shipping_address.city",
      "shipping_address.phone",
      "items.title",
      "items.product_title",
      "items.quantity",
      "items.detail.quantity",
      "items.unit_price",
      "payment_collections.status",
    ],
    filters: { display_id: number },
  })

  const order = orders.find((o: any) =>
    phonesMatch(o.shipping_address?.phone, phone)
  )

  if (!order) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Order not found for this number/phone combination"
    )
  }

  const paymentStatus = (order.payment_collections ?? []).some(
    (pc: any) => pc?.status === "completed"
  )
    ? "paid"
    : "pending"

  const address = order.shipping_address
  const customerName = [address?.first_name, address?.last_name]
    .filter(Boolean)
    .join(" ")

  res.json({
    order: {
      number: String(order.display_id),
      status: order.status,
      payment_status: paymentStatus,
      // Manual/system payments only for now — no online retry flow.
      payment_method: "cod",
      can_retry_payment: false,
      total_price: order.total,
      currency_code: order.currency_code,
      customer_name: customerName,
      shipping_address: [address?.address_1, address?.city]
        .filter(Boolean)
        .join(", "),
      created_at: order.created_at,
      items: (order.items ?? []).map((item: any) => ({
        product_name: item.product_title || item.title,
        quantity: item.quantity ?? item.detail?.quantity ?? 1,
        price: item.unit_price,
      })),
    },
  })
}
