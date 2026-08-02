import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { zodValidator } from "../../../utils/zod-validator"
import { EVENT_MODULE } from "../../../../modules/event"
import type EventModuleService from "../../../../modules/event/service"
import { normalizeTiptapImageUrls, toRelativeMediaUrl } from "../../../utils/media-url"

const UpdateEventSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  thumbnail: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  start_at: z.string().datetime().nullable().optional(),
  end_at: z.string().datetime().nullable().optional(),
  capacity: z.number().int().positive().nullable().optional(),
  registration_open: z.boolean().optional(),
  is_active: z.boolean().optional(),
  seo_title: z.string().nullable().optional(),
  seo_description: z.string().nullable().optional(),
  seo_keywords: z.string().nullable().optional(),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  const eventModuleService: EventModuleService = req.scope.resolve(EVENT_MODULE)

  const event = await eventModuleService.retrieveEvent(id)
  const seatsByEvent = await eventModuleService.countRegisteredSeats([id])

  res.json({
    event: { ...event, registered_seats: seatsByEvent.get(id) ?? 0 },
  })
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  const eventModuleService: EventModuleService = req.scope.resolve(EVENT_MODULE)

  const body = await zodValidator(UpdateEventSchema, req.body)

  const event = await eventModuleService.updateEvents({
    id,
    ...body,
    content: body.content === undefined ? undefined : normalizeTiptapImageUrls(body.content),
    thumbnail: body.thumbnail === undefined ? undefined : toRelativeMediaUrl(body.thumbnail),
    start_at:
      body.start_at === undefined
        ? undefined
        : body.start_at
          ? new Date(body.start_at)
          : null,
    end_at:
      body.end_at === undefined
        ? undefined
        : body.end_at
          ? new Date(body.end_at)
          : null,
  })

  res.json({ event })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  const eventModuleService: EventModuleService = req.scope.resolve(EVENT_MODULE)

  await eventModuleService.deleteEvents(id)

  res.status(200).json({
    id,
    object: "event",
    deleted: true,
  })
}
