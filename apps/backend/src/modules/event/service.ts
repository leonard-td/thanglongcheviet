import {
  InjectManager,
  MedusaContext,
  MedusaService,
} from "@medusajs/framework/utils"
import type { Context } from "@medusajs/framework/types"
import Event from "./models/event"
import EventRegistration from "./models/event-registration"
import { sumRegisteredSeatsByEvent } from "../../lib/pg-query"

type EventFilters = {
  id?: string | string[]
  slug?: string | string[]
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
    @MedusaContext() _sharedContext: Context = {}
  ): Promise<Map<string, number>> {
    return sumRegisteredSeatsByEvent(eventIds)
  }
}

export default EventModuleService
