import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { EVENT_MODULE } from "../../../modules/event"
import type EventModuleService from "../../../modules/event/service"
import { CARE_CHANNEL_MODULE } from "../../../modules/care-channel"
import type CareChannelModuleService from "../../../modules/care-channel/service"
import { formatEventRegistrationMessage } from "../../../modules/care-channel/utils/format"

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
 * Public endpoint for visitors to reserve seats at an event. Capacity is
 * checked atomically so concurrent registrations cannot exceed limits.
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

  const seats = Math.floor(Number(quantity) || 1)
  if (seats < 1 || seats > 20) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "quantity must be between 1 and 20"
    )
  }

  const eventModuleService: EventModuleService = req.scope.resolve(EVENT_MODULE)

  const { registration, event } =
    await eventModuleService.registerForEventIfAvailable({
      event_id: event_id.trim(),
      name: name.trim().slice(0, 200),
      phone: phone.trim().slice(0, 30),
      email: email?.trim().slice(0, 200) || null,
      quantity: seats,
      message: message?.trim().slice(0, 4000) || null,
      source: source?.trim().slice(0, 100) || "website",
    })

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
