import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { EVENT_MODULE } from "../../../modules/event"
import type EventModuleService from "../../../modules/event/service"
import { parsePagination } from "../../utils/pagination"

/**
 * GET /store/events?limit=&offset=
 *
 * Lists active events, soonest upcoming first (events without a date last),
 * each with registered_seats/seats_left so the storefront can show capacity.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const eventModuleService: EventModuleService = req.scope.resolve(EVENT_MODULE)

  const { limit, offset } = parsePagination(req.query, {
    limit: 20,
    max: 100,
  })

  const [events, count] = await eventModuleService.listAndCountActiveEvents(
    {},
    { take: limit, skip: offset, order: { start_at: "ASC" } }
  )

  const seatsByEvent = await eventModuleService.countRegisteredSeats(
    events.map((event) => event.id)
  )

  res.json({
    events: events.map((event) => {
      const registered = seatsByEvent.get(event.id) ?? 0
      return {
        ...event,
        registered_seats: registered,
        seats_left:
          event.capacity === null ? null : Math.max(0, event.capacity - registered),
      }
    }),
    count,
    limit,
    offset,
  })
}
