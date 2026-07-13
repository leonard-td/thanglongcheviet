import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { zodValidator } from "@medusajs/framework/zod"
import { EVENT_MODULE } from "../../../modules/event"
import type EventModuleService from "../../../modules/event/service"
import { normalizeTiptapImageUrls, toRelativeMediaUrl } from "../../utils/media-url"

const CreateEventSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).optional(),
  content: z.record(z.string(), z.unknown()).default({}),
  thumbnail: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  start_at: z.string().datetime().nullable().optional(),
  end_at: z.string().datetime().nullable().optional(),
  capacity: z.number().int().positive().nullable().optional(),
  registration_open: z.boolean().default(true),
  is_active: z.boolean().default(true),
  seo_title: z.string().nullable().optional(),
  seo_description: z.string().nullable().optional(),
  seo_keywords: z.string().nullable().optional(),
})

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const eventModuleService: EventModuleService = req.scope.resolve(EVENT_MODULE)

  const { take, skip } = req.queryConfig.pagination

  const [events, count] = await eventModuleService.listAndCountEvents(
    {},
    { take, skip, order: { created_at: "DESC" } }
  )

  const seatsByEvent = await eventModuleService.countRegisteredSeats(
    events.map((event) => event.id)
  )

  res.json({
    events: events.map((event) => ({
      ...event,
      registered_seats: seatsByEvent.get(event.id) ?? 0,
    })),
    count,
    limit: take,
    offset: skip,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const eventModuleService: EventModuleService = req.scope.resolve(EVENT_MODULE)

  const body = await zodValidator(, req.body)
  const slug = body.slug || slugify(body.title)

  const event = await eventModuleService.createEvents({
    title: body.title,
    slug,
    content: normalizeTiptapImageUrls(body.content),
    thumbnail: toRelativeMediaUrl(body.thumbnail),
    location: body.location ?? null,
    start_at: body.start_at ? new Date(body.start_at) : null,
    end_at: body.end_at ? new Date(body.end_at) : null,
    capacity: body.capacity ?? null,
    registration_open: body.registration_open,
    is_active: body.is_active,
    seo_title: body.seo_title ?? null,
    seo_description: body.seo_description ?? null,
    seo_keywords: body.seo_keywords ?? null,
  })

  res.status(201).json({ event })
}
