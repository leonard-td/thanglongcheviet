import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { INQUIRY_MODULE } from "../../../modules/inquiry"
import type InquiryModuleService from "../../../modules/inquiry/service"
import { countBookingsForSlot, withBookingSlotLock } from "../../../lib/pg-query"
import { enforceStoreRateLimit } from "../../utils/store-rate-limit"

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
const SLOT_CAPACITY = Number(process.env.BOOKING_SLOT_CAPACITY || 3)

/**
 * POST /store/bookings
 *
 * Creates a visit/tasting booking. Rejects slots that are already full.
 */
export async function POST(
  req: MedusaRequest<BookingBody>,
  res: MedusaResponse,
) {
  await enforceStoreRateLimit(req, res, {
    name: "bookings",
    limit: 10,
    windowMs: 60_000,
  })

  const { name, phone, email, service, note, preferred_date, preferred_time } =
    req.body ?? {}

  if (!name?.trim() || !phone?.trim()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "name and phone are required",
    )
  }
  if (!preferred_date || !DATE_RE.test(preferred_date)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "preferred_date must be YYYY-MM-DD",
    )
  }
  if (preferred_time && !TIME_RE.test(preferred_time)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "preferred_time must be HH:mm",
    )
  }

  const inquiryService: InquiryModuleService = req.scope.resolve(INQUIRY_MODULE)

  const createBooking = async () => {
    if (preferred_time) {
      const taken = await countBookingsForSlot(preferred_date, preferred_time)
      if (taken >= SLOT_CAPACITY) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "The selected time slot is no longer available",
        )
      }
    }

    return inquiryService.createInquiries({
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
  }

  const inquiry = preferred_time
    ? await withBookingSlotLock(preferred_date, preferred_time, createBooking)
    : await createBooking()

  res.status(201).json({ success: true, inquiry_id: inquiry.id })
}
