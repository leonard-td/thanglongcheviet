import { MedusaService } from "@medusajs/framework/utils"
import Inquiry from "./models/inquiry"
import { connectDb } from "../../lib/backup/db"

export type BookingSlot = {
  time: string
  available: boolean
}

/** Bookable time slots per day (lunch break excluded). */
export const DAILY_SLOTS = [
  "09:00",
  "10:00",
  "11:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
]

/** How many bookings a single slot can take before it closes. */
export function getSlotCapacity(): number {
  const configured = Number(process.env.BOOKING_SLOT_CAPACITY || 3)
  return Number.isInteger(configured) && configured > 0 ? configured : 3
}

class InquiryModuleService extends MedusaService({
  Inquiry,
}) {
  /**
   * Availability for a given date: every daily slot with a flag telling
   * whether it still has capacity (cancelled bookings don't count).
   */
  async getAvailability(date: string): Promise<BookingSlot[]> {
    const client = await connectDb()
    const counts = new Map<string, number>()
    try {
      const result = await client.query(
        `SELECT preferred_time, count(*)::int AS count
         FROM inquiry
         WHERE deleted_at IS NULL
           AND type = 'booking'
           AND preferred_date = $1
           AND status IN ('new', 'confirmed')
         GROUP BY preferred_time`,
        [date]
      )
      for (const row of result.rows) {
        if (row.preferred_time) {
          counts.set(String(row.preferred_time), Number(row.count))
        }
      }
    } finally {
      await client.end()
    }

    const capacity = getSlotCapacity()
    return DAILY_SLOTS.map((time) => ({
      time,
      available: (counts.get(time) ?? 0) < capacity,
    }))
  }
}

export default InquiryModuleService
