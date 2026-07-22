import { MedusaService } from "@medusajs/framework/utils"
import Inquiry from "./models/inquiry"
import { countBookingsByDate } from "../../lib/pg-query"

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

class InquiryModuleService extends MedusaService({
  Inquiry,
}) {
  /**
   * Availability for a given date: every daily slot with a flag telling
   * whether it still has capacity (cancelled bookings don't count).
   */
  async getAvailability(date: string): Promise<BookingSlot[]> {
    const counts = await countBookingsByDate(date)

    return DAILY_SLOTS.map((time) => ({
      time,
      available: (counts.get(time) ?? 0) < SLOT_CAPACITY,
    }))
  }
}

export default InquiryModuleService
