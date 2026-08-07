import type { JSONContent } from "@tiptap/core"

export type EventContent = JSONContent

export type AppEvent = {
  id: string
  title: string
  slug: string
  content: EventContent
  thumbnail: string | null
  location: string | null
  start_at: string | null
  end_at: string | null
  capacity: number | null
  registration_open: boolean
  topic_id: string | null
  is_active: boolean
  seo_title: string | null
  seo_description: string | null
  seo_keywords: string | null
  registered_seats?: number
  created_at?: string
}

export type EventsResponse = {
  events: AppEvent[]
  count: number
  limit: number
  offset: number
}

export type EventResponse = {
  event: AppEvent
}
