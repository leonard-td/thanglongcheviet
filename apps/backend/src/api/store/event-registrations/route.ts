import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { EVENT_MODULE } from "../../../modules/event"
import type EventModuleService from "../../../modules/event/service"
import { connectDb } from "../../../lib/backup/db"
import { sumRegisteredSeatsByEvent } from "../../../lib/pg-query"
import { enforceStoreRateLimit } from "../../utils/store-rate-limit"

type RegisterBody = {
  event_id?: string
  name?: string
  phone?: string
  email?: string
  quantity?: number
  message?: string
  source?: string
}

function eventLockKey(eventId: string): number {
  let hash = 0
  for (let i = 0; i < eventId.length; i++) {
    hash = (hash * 31 + eventId.charCodeAt(i)) | 0
  }
  return Math.abs(hash) || 1
}

/**
 * POST /store/event-registrations
 *
 * Public endpoint for visitors to reserve seats at an event.
 */
export async function POST(req: MedusaRequest<RegisterBody>, res: MedusaResponse) {
  await enforceStoreRateLimit(req, res, {
    name: "event-registrations",
    limit: 10,
    windowMs: 60_000,
  })

  const { event_id, name, phone, email, quantity, message, source } =
    req.body ?? {}

  if (!event_id?.trim() || !name?.trim() || !phone?.trim()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "event_id, name and phone are required",
    )
  }

  const seats = Math.floor(Number(quantity) || 1)
  if (seats < 1 || seats > 20) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "quantity must be between 1 and 20",
    )
  }

  const eventModuleService: EventModuleService = req.scope.resolve(EVENT_MODULE)

  const [event] = await eventModuleService.listActiveEvents(
    { id: event_id },
    { take: 1 },
  )
  if (!event) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Event not found")
  }

  if (!event.registration_open) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Registration for this event is closed",
    )
  }

  const client = await connectDb()
  const lockKey = eventLockKey(event.id)
  try {
    await client.query("SELECT pg_advisory_lock($1)", [lockKey])

    if (event.capacity !== null) {
      const seatsByEvent = await sumRegisteredSeatsByEvent([event.id])
      const registered = seatsByEvent.get(event.id) ?? 0
      if (registered + seats > event.capacity) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "Not enough seats left for this event",
        )
      }
    }

    const registration = await eventModuleService.createEventRegistrations({
      event_id: event.id,
      name: name.trim().slice(0, 200),
      phone: phone.trim().slice(0, 30),
      email: email?.trim().slice(0, 200) || null,
      quantity: seats,
      message: message?.trim().slice(0, 4000) || null,
      source: source?.trim().slice(0, 100) || "website",
    })

    res.status(201).json({ success: true, event_registration_id: registration.id })
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [lockKey]).catch(() => {})
    await client.end()
  }
}
