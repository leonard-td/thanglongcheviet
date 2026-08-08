import {
  MedusaError,
  MedusaService,
} from "@medusajs/framework/utils"
import Inquiry from "./models/inquiry"
import {
  countActiveBookings,
  withBookingSlotLock,
} from "../utils/booking-slot-lock"

export type BookingSlot = {
  time: string
  available: boolean
}

/** Bookable time slots per day (lunch break excluded). */
const DAILY_SLOTS = [
  "09:00",
  "10:00",
  "11:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
]

/** How many bookings a single slot can take before it closes. */
const SLOT_CAPACITY = Number(process.env.BOOKING_SLOT_CAPACITY || 3)

export type CreateBookingInput = {
  name: string
  phone: string
  email?: string | null
  service?: string | null
  message?: string | null
  source?: string | null
  preferred_date: string
  preferred_time: string
}

class InquiryModuleService extends MedusaService({
  Inquiry,
}) {
  /**
   * Availability for a given date: every daily slot with a flag telling
   * whether it still has capacity (cancelled bookings don't count).
   */
  async getAvailability(date: string): Promise<BookingSlot[]> {
    const bookings = await this.listInquiries(
      {
        type: "booking",
        preferred_date: date,
        status: ["new", "confirmed"],
      },
      { select: ["id", "preferred_time"], take: 1000 }
    )

    const counts = new Map<string, number>()
    for (const b of bookings) {
      if (!b.preferred_time) continue
      counts.set(b.preferred_time, (counts.get(b.preferred_time) ?? 0) + 1)
    }

    return DAILY_SLOTS.map((time) => ({
      time,
      available: (counts.get(time) ?? 0) < SLOT_CAPACITY,
    }))
  }

  /**
   * Creates a booking after an atomic capacity check for the chosen slot.
   * Session-level advisory locks serialize concurrent requests for the same
   * date/time before the count-and-insert runs.
   */
  async createBookingIfAvailable(data: CreateBookingInput) {
    return await withBookingSlotLock(
      data.preferred_date,
      data.preferred_time,
      async () => {
        const bookedCount = await countActiveBookings(
          data.preferred_date,
          data.preferred_time
        )

        if (bookedCount >= SLOT_CAPACITY) {
          throw new MedusaError(
            MedusaError.Types.NOT_ALLOWED,
            "The selected time slot is no longer available"
          )
        }

        return await this.createInquiries({
          type: "booking",
          name: data.name,
          phone: data.phone,
          email: data.email ?? null,
          service: data.service ?? null,
          message: data.message ?? null,
          source: data.source ?? null,
          preferred_date: data.preferred_date,
          preferred_time: data.preferred_time,
          status: "new",
        })
      }
    )
  }
}

export default InquiryModuleService
