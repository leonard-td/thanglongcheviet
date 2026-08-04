import { model } from "@medusajs/framework/utils"

/**
 * A storefront inquiry: either a plain contact request or a visit/tasting
 * booking (type="booking" carries preferred_date/preferred_time).
 */
const Inquiry = model.define("inquiry", {
  id: model.id({ prefix: "inq" }).primaryKey(),
  type: model.enum(["contact", "booking"]).default("contact"),
  name: model.text(),
  phone: model.text().searchable(),
  normalized_phone: model.text().nullable(),
  email: model.text().nullable(),
  normalized_email: model.text().nullable(),
  service: model.text().nullable(),
  message: model.text().nullable(),
  source: model.text().nullable(),
  /** YYYY-MM-DD (kept as text to avoid timezone drift) */
  preferred_date: model.text().nullable(),
  /** HH:mm */
  preferred_time: model.text().nullable(),
  status: model
    .enum(["new", "confirmed", "completed", "cancelled"])
    .default("new"),
})

export default Inquiry
