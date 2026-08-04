import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { zodValidator } from "../../../utils/zod-validator"
import { EVENT_MODULE } from "../../../../modules/event"
import type EventModuleService from "../../../../modules/event/service"
import { withDatabaseLock } from "../../../../lib/database-lock"

const UpdateEventRegistrationSchema = z.object({
  status: z.enum(["new", "contacted", "confirmed", "cancelled"]).optional(),
  staff_note: z.string().nullable().optional(),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  const eventModuleService: EventModuleService = req.scope.resolve(EVENT_MODULE)

  const registration = await eventModuleService.retrieveEventRegistration(id)

  let event: { id: string; title: string; slug: string } | null = null
  if (registration.event_id) {
    const events = await eventModuleService.listEvents(
      { id: registration.event_id },
      { take: 1 }
    )
    if (events.length) {
      event = { id: events[0].id, title: events[0].title, slug: events[0].slug }
    }
  }

  res.json({ event_registration: { ...registration, event } })
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  const eventModuleService: EventModuleService = req.scope.resolve(EVENT_MODULE)

  const body = await zodValidator(UpdateEventRegistrationSchema, req.body)

  const [existing] = await eventModuleService.listEventRegistrations(
    { id },
    { take: 1 }
  )
  if (!existing) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Event registration not found"
    )
  }

  const registration = await withDatabaseLock(
    `event-capacity:${existing.event_id}`,
    async (client) => {
      if (
        existing.status === "cancelled" &&
        body.status &&
        body.status !== "cancelled"
      ) {
        const result = await client.query(
          `SELECT e.capacity,
                  coalesce(sum(r.quantity) filter (
                    where r.deleted_at is null and r.status <> 'cancelled'
                  ), 0)::int AS seats
           FROM event e
           LEFT JOIN event_registration r ON r.event_id = e.id
           WHERE e.id = $1 AND e.deleted_at IS NULL
           GROUP BY e.id, e.capacity`,
          [existing.event_id]
        )
        const row = result.rows[0]
        if (
          row?.capacity !== null &&
          Number(row?.seats ?? 0) + (existing.quantity ?? 1) >
            Number(row.capacity)
        ) {
          throw new MedusaError(
            MedusaError.Types.NOT_ALLOWED,
            "Reactivating this registration would exceed event capacity"
          )
        }
      }

      return await eventModuleService.updateEventRegistrations({
        id,
        ...body,
      })
    }
  )

  let event: { id: string; title: string; slug: string } | null = null
  if (registration.event_id) {
    const events = await eventModuleService.listEvents(
      { id: registration.event_id },
      { take: 1 }
    )
    if (events.length) {
      event = { id: events[0].id, title: events[0].title, slug: events[0].slug }
    }
  }

  res.json({ event_registration: { ...registration, event } })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  const eventModuleService: EventModuleService = req.scope.resolve(EVENT_MODULE)

  await eventModuleService.deleteEventRegistrations(id)

  res.status(200).json({
    id,
    object: "event_registration",
    deleted: true,
  })
}
