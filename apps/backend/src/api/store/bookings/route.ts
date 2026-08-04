import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { INQUIRY_MODULE } from "../../../modules/inquiry"
import type InquiryModuleService from "../../../modules/inquiry/service"
import { CARE_CHANNEL_MODULE } from "../../../modules/care-channel"
import type CareChannelModuleService from "../../../modules/care-channel/service"
import { formatBookingMessage } from "../../../modules/care-channel/utils/format"
import {
  DAILY_SLOTS,
  getSlotCapacity,
} from "../../../modules/inquiry/service"
import { withDatabaseLock } from "../../../lib/database-lock"
import { isFutureOrTodayInVietnam } from "../../utils/date"
import { normalizePhone } from "../../utils/phone"

type BookingBody = {
  name?: string
  phone?: string
  email?: string
  service?: string
  note?: string
  preferred_date?: string
  preferred_time?: string
}

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
  if (!preferred_date || !isFutureOrTodayInVietnam(preferred_date)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "preferred_date must be a valid date that is not in the past"
    )
  }
  if (!preferred_time || !DAILY_SLOTS.includes(preferred_time)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "preferred_time must be one of the available booking slots"
    )
  }

  const inquiryService: InquiryModuleService = req.scope.resolve(INQUIRY_MODULE)

  const inquiry = await withDatabaseLock(
    `booking-slot:${preferred_date}:${preferred_time}`,
    async (client) => {
      const countResult = await client.query(
        `SELECT count(*)::int AS count
         FROM inquiry
         WHERE deleted_at IS NULL
           AND type = 'booking'
           AND preferred_date = $1
           AND preferred_time = $2
           AND status IN ('new', 'confirmed')`,
        [preferred_date, preferred_time]
      )
      if (Number(countResult.rows[0]?.count ?? 0) >= getSlotCapacity()) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "The selected time slot is no longer available"
        )
      }

      return await inquiryService.createInquiries({
        type: "booking",
        name: name.trim().slice(0, 200),
        phone: phone.trim().slice(0, 30),
        normalized_phone: normalizePhone(phone),
        email: email?.trim().slice(0, 200) || null,
        normalized_email: email?.trim().toLowerCase().slice(0, 200) || null,
        service: service?.trim().slice(0, 200) || null,
        message: note?.trim().slice(0, 4000) || null,
        source: "booking-form",
        preferred_date,
        preferred_time,
        status: "new",
      })
    }
  )

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
