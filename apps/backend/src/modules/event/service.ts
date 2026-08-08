import {
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
  MedusaError,
  MedusaService,
} from "@medusajs/framework/utils"
import type { Context } from "@medusajs/framework/types"
import Event from "./models/event"
import EventRegistration from "./models/event-registration"
import { acquireAdvisoryXactLock } from "../utils/advisory-lock"

type EventFilters = {
  id?: string | string[]
  slug?: string | string[]
  topic_id?: string | string[]
  is_active?: boolean
}

export type RegisterForEventInput = {
  event_id: string
  name: string
  phone: string
  email?: string | null
  quantity: number
  message?: string | null
  source?: string | null
}

class EventModuleService extends MedusaService({
  Event,
  EventRegistration,
}) {
  @InjectManager()
  async listActiveEvents(
    filters: EventFilters = {},
    config: Record<string, unknown> = {},
    @MedusaContext() sharedContext: Context = {}
  ) {
    return await this.listEvents(
      { ...filters, is_active: true },
      config,
      sharedContext
    )
  }

  @InjectManager()
  async listAndCountActiveEvents(
    filters: EventFilters = {},
    config: Record<string, unknown> = {},
    @MedusaContext() sharedContext: Context = {}
  ) {
    return await this.listAndCountEvents(
      { ...filters, is_active: true },
      config,
      sharedContext
    )
  }

  /**
   * Seats already taken per event: the summed quantity of every registration
   * that isn't cancelled. Used for capacity checks and "seats left" display.
   */
  @InjectManager()
  async countRegisteredSeats(
    eventIds: string[],
    @MedusaContext() sharedContext: Context = {}
  ): Promise<Map<string, number>> {
    const seatsByEvent = new Map<string, number>()

    if (!eventIds.length) {
      return seatsByEvent
    }

    const registrations = await this.listEventRegistrations(
      { event_id: eventIds, status: { $ne: "cancelled" } },
      { select: ["event_id", "quantity"] },
      sharedContext
    )

    for (const registration of registrations) {
      seatsByEvent.set(
        registration.event_id,
        (seatsByEvent.get(registration.event_id) ?? 0) +
          (registration.quantity ?? 1)
      )
    }

    return seatsByEvent
  }

  /**
   * Registers seats for an event after an atomic capacity check.
   * Uses a transaction-scoped advisory lock per event so concurrent
   * registrations cannot exceed capacity.
   */
  @InjectManager()
  @InjectTransactionManager()
  async registerForEventIfAvailable(
    input: RegisterForEventInput,
    @MedusaContext() sharedContext: Context = {}
  ) {
    await acquireAdvisoryXactLock(
      sharedContext,
      `event_reg:${input.event_id}`
    )

    const [event] = await this.listActiveEvents(
      { id: input.event_id },
      { take: 1 },
      sharedContext
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

    if (event.capacity !== null) {
      const seatsByEvent = await this.countRegisteredSeats(
        [event.id],
        sharedContext
      )
      const registered = seatsByEvent.get(event.id) ?? 0
      if (registered + input.quantity > event.capacity) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "Not enough seats left for this event"
        )
      }
    }

    const registration = await this.createEventRegistrations(
      {
        event_id: event.id,
        name: input.name,
        phone: input.phone,
        email: input.email ?? null,
        quantity: input.quantity,
        message: input.message ?? null,
        source: input.source ?? null,
      },
      sharedContext
    )

    return { registration, event }
  }
}

export default EventModuleService
