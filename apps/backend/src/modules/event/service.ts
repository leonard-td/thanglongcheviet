import {
  InjectManager,
  MedusaContext,
  MedusaService,
} from "@medusajs/framework/utils"
import type { Context } from "@medusajs/framework/types"
import Event from "./models/event"
import EventRegistration from "./models/event-registration"

type EventFilters = {
  id?: string | string[]
  slug?: string | string[]
  topic_id?: string | string[]
  is_active?: boolean
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
}

export default EventModuleService
