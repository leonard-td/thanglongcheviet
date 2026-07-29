import {
  InjectManager,
  MedusaContext,
  MedusaService,
} from "@medusajs/framework/utils"
import type { Context } from "@medusajs/framework/types"
import Event from "./models/event"
import EventRegistration from "./models/event-registration"
import { connectDb } from "../../lib/backup/db"

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
    @MedusaContext() sharedContext: Context = {}
  ): Promise<Map<string, number>> {
    const seatsByEvent = new Map<string, number>()

    if (!eventIds.length) {
      return seatsByEvent
    }

    const client = await connectDb()
    try {
      const result = await client.query(
        `SELECT event_id, coalesce(sum(quantity), 0)::int AS seats
         FROM event_registration
         WHERE deleted_at IS NULL
           AND status <> 'cancelled'
           AND event_id = ANY($1::text[])
         GROUP BY event_id`,
        [eventIds]
      )
      for (const row of result.rows) {
        seatsByEvent.set(String(row.event_id), Number(row.seats))
      }
    } finally {
      await client.end()
    }

    return seatsByEvent
  }
}

export default EventModuleService
