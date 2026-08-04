import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { EVENT_MODULE } from "../../../modules/event"
import type EventModuleService from "../../../modules/event/service"
import { CARE_CHANNEL_MODULE } from "../../../modules/care-channel"
import type CareChannelModuleService from "../../../modules/care-channel/service"
import { formatEventRegistrationMessage } from "../../../modules/care-channel/utils/format"
import { withDatabaseLock } from "../../../lib/database-lock"

type RegisterBody = {
  event_id?: string
  name?: string
  phone?: string
  email?: string
  quantity?: number
  message?: string
  source?: string
}

/**
 * POST /store/event-registrations
 *
 * Public endpoint for visitors to reserve seats at an event. Rejects when
 * the event is missing/inactive, registration is closed, or the remaining
 * capacity can't fit the requested quantity.
 */
export async function POST(req: MedusaRequest<RegisterBody>, res: MedusaResponse) {
  const { event_id, name, phone, email, quantity, message, source } =
    req.body ?? {}

  if (!event_id?.trim() || !name?.trim() || !phone?.trim()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "event_id, name and phone are required"
    )
  }

  const seats = quantity === undefined ? 1 : Number(quantity)
  if (!Number.isInteger(seats) || seats < 1 || seats > 20) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "quantity must be between 1 and 20"
    )
  }

  const eventModuleService: EventModuleService = req.scope.resolve(EVENT_MODULE)

  const [event] = await eventModuleService.listActiveEvents(
    { id: event_id },
    { take: 1 }
  )
  if (!event) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Event not found")
  }

  if (!event.registration_open) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Registration for this event is closed"
    )
  }

  if (event.end_at && new Date(event.end_at).getTime() < Date.now()) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Registration for this event has ended"
    )
  }

  const registration = await withDatabaseLock(
    `event-capacity:${event.id}`,
    async (client) => {
      const currentEvent = await client.query(
        `SELECT capacity, registration_open, is_active, end_at
         FROM event
         WHERE id = $1 AND deleted_at IS NULL`,
        [event.id]
      )
      const row = currentEvent.rows[0]
      if (
        !row ||
        !row.is_active ||
        !row.registration_open ||
        (row.end_at && new Date(row.end_at).getTime() < Date.now())
      ) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "Registration for this event is closed"
        )
      }

      if (row.capacity !== null) {
        const countResult = await client.query(
          `SELECT coalesce(sum(quantity), 0)::int AS seats
           FROM event_registration
           WHERE event_id = $1
             AND deleted_at IS NULL
             AND status <> 'cancelled'`,
          [event.id]
        )
        const registered = Number(countResult.rows[0]?.seats ?? 0)
        if (registered + seats > Number(row.capacity)) {
          throw new MedusaError(
            MedusaError.Types.NOT_ALLOWED,
            "Not enough seats left for this event"
          )
        }
      }

      return await eventModuleService.createEventRegistrations({
        event_id: event.id,
        name: name.trim().slice(0, 200),
        phone: phone.trim().slice(0, 30),
        email: email?.trim().slice(0, 200) || null,
        quantity: seats,
        message: message?.trim().slice(0, 4000) || null,
        source: source?.trim().slice(0, 100) || "website",
      })
    }
  )

  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const careService: CareChannelModuleService =
    req.scope.resolve(CARE_CHANNEL_MODULE)

  careService
    .notifySupportChannels(
      formatEventRegistrationMessage({
        ...registration,
        eventTitle: event.title ?? null,
      })
    )
    .catch((error) => {
      logger.warn(
        `care-channel: failed to forward event registration ${registration.id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    })

  res.status(201).json({ success: true, event_registration_id: registration.id })
}
