import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { INQUIRY_MODULE } from "../../../../modules/inquiry"
import type InquiryModuleService from "../../../../modules/inquiry/service"
import { phonesMatch } from "../../../utils/phone"

/**
 * DELETE /store/my-bookings/:id
 *
 * Cancels one of the logged-in customer's own bookings.
 */
export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params
  const customerId = req.auth_context.actor_id

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: customers } = await query.graph({
    entity: "customer",
    fields: ["id", "phone", "email"],
    filters: { id: customerId },
  })
  const customer = customers[0]

  const inquiryService: InquiryModuleService = req.scope.resolve(INQUIRY_MODULE)
  const [booking] = await inquiryService.listInquiries(
    { id, type: "booking" },
    { take: 1 }
  )

  const ownsBooking =
    booking &&
    customer &&
    (phonesMatch(booking.phone, customer.phone) ||
      (customer.email &&
        booking.email?.trim().toLowerCase() ===
          customer.email.trim().toLowerCase()))

  if (!ownsBooking) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Booking not found")
  }

  if (["completed", "cancelled"].includes(booking.status)) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "This booking can no longer be cancelled"
    )
  }

  await inquiryService.updateInquiries({ id, status: "cancelled" })

  res.json({ success: true })
}
