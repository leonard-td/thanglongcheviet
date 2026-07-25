import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { INQUIRY_MODULE } from "../../../modules/inquiry"
import type InquiryModuleService from "../../../modules/inquiry/service"
import { CARE_CHANNEL_MODULE } from "../../../modules/care-channel"
import type CareChannelModuleService from "../../../modules/care-channel/service"
import { formatBookingMessage } from "../../../modules/care-channel/utils/format"

type BookingBody = {
  name?: string
  phone?: string
  email?: string
  service?: string
  note?: string
  preferred_date?: string
  preferred_time?: string
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{2}:\d{2}$/

/**
 * POST /store/bookings
 *
 * Creates a visit/tasting booking. Rejects slots that are already full.
 */
export async function POST(
  req: MedusaRequest<BookingBody>,
  res: MedusaResponse
) {
  const { name, phone, email, service, note, preferred_date, preferred_time } =
    req.body ?? {}

  if (!name?.trim() || !phone?.trim()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "name and phone are required"
    )
  }
  if (!preferred_date || !DATE_RE.test(preferred_date)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "preferred_date must be YYYY-MM-DD"
    )
  }
  if (preferred_time && !TIME_RE.test(preferred_time)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "preferred_time must be HH:mm"
    )
  }

  const inquiryService: InquiryModuleService = req.scope.resolve(INQUIRY_MODULE)

  if (preferred_time) {
    const slots = await inquiryService.getAvailability(preferred_date)
    const slot = slots.find((s) => s.time === preferred_time)
    if (!slot || !slot.available) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "The selected time slot is no longer available"
      )
    }
  }

  const inquiry = await inquiryService.createInquiries({
    type: "booking",
    name: name.trim().slice(0, 200),
    phone: phone.trim().slice(0, 30),
    email: email?.trim().slice(0, 200) || null,
    service: service?.trim().slice(0, 200) || null,
    message: note?.trim().slice(0, 4000) || null,
    source: "booking-form",
    preferred_date,
    preferred_time: preferred_time || null,
    status: "new",
  })

  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const careService: CareChannelModuleService =
    req.scope.resolve(CARE_CHANNEL_MODULE)
  careService
    .notifySupportChannels(formatBookingMessage(inquiry))
    .catch((error) => {
      logger.warn(
        `care-channel: failed to forward booking ${inquiry.id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    })

  res.status(201).json({ success: true, inquiry_id: inquiry.id })
}
