import { parseApiError } from '~/utils/storefront'
import { FALLBACK_POST_IMAGE } from '~/utils/storefront'
import { tiptapFirstImage, tiptapToHtml, tiptapToText } from '~/utils/tiptap'

interface StoreEvent {
  id: string
  title: string
  slug: string
  content: unknown
  thumbnail?: string | null
  location?: string | null
  start_at: string | null
  end_at: string | null
  capacity: number | null
  registration_open: boolean
  topic_id?: string | null
  registered_seats?: number
  seats_left?: number | null
  created_at?: string
  seo_title?: string | null
  seo_description?: string | null
  seo_keywords?: string | null
}

export interface EventItem {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  image: string
  location: string | null
  startAt: string | null
  endAt: string | null
  capacity: number | null
  seatsLeft: number | null
  registrationOpen: boolean
  topicId: string | null
  isPast: boolean
  seoTitle: string | null
  seoDescription: string | null
  seoKeywords: string | null
}

export interface EventRegistrationData {
  eventId: string
  name: string
  phone: string
  email?: string
  quantity: number
  message?: string
}

function transformStoreEvent(e: StoreEvent, resolveUrl: (url: string | null | undefined) => string): EventItem {
  const content = tiptapToHtml(e.content, resolveUrl)
  const plain = tiptapToText(e.content)
  const reference = e.end_at || e.start_at
  return {
    id: e.id,
    slug: e.slug,
    title: e.title,
    excerpt: plain.slice(0, 200) + (plain.length > 200 ? '…' : ''),
    content,
    image: resolveUrl(e.thumbnail) || tiptapFirstImage(e.content, resolveUrl) || FALLBACK_POST_IMAGE,
    location: e.location || null,
    startAt: e.start_at,
    endAt: e.end_at,
    capacity: e.capacity,
    seatsLeft: e.seats_left ?? null,
    registrationOpen: e.registration_open,
    topicId: e.topic_id ?? null,
    isPast: reference ? new Date(reference).getTime() < Date.now() : false,
    seoTitle: e.seo_title || null,
    seoDescription: e.seo_description || null,
    seoKeywords: e.seo_keywords || null,
  }
}

/**
 * Events come from the Medusa backend's event module
 * (GET /store/events, content authored with TipTap in the admin).
 * Registrations are posted to POST /store/event-registrations and handled
 * by staff in the admin dashboard.
 */
export function useEvents() {
  const { fetchMedusa } = useMedusaApi()
  const { t } = useI18n()
  const { resolveMediaUrl } = useMediaUrl()

  const { data: eventsData, pending } = useAsyncData(
    'store-events',
    async () => {
      try {
        const res = await fetchMedusa<{ events: StoreEvent[] }>('/store/events?limit=50')
        return res.events ?? []
      } catch (e) {
        console.warn('Events API unavailable', e)
        return [] as StoreEvent[]
      }
    },
    { default: () => [] as StoreEvent[] },
  )

  const events = computed<EventItem[]>(() =>
    (eventsData.value ?? []).map(e => transformStoreEvent(e, resolveMediaUrl)),
  )

  // Soonest upcoming first; the store API returns start_at DESC, so reverse
  const upcomingEvents = computed<EventItem[]>(() =>
    events.value.filter(e => !e.isPast).slice().reverse(),
  )
  const pastEvents = computed<EventItem[]>(() => events.value.filter(e => e.isPast))

  const byTopic = (topicId: string | null) => {
    if (!topicId) return []
    return events.value.filter(e => e.topicId === topicId)
  }

  const getBySlug = async (slug: string): Promise<EventItem | null> => {
    try {
      const res = await fetchMedusa<{ event: StoreEvent }>(
        `/store/events/${encodeURIComponent(slug)}`,
      )
      if (res.event) return transformStoreEvent(res.event, resolveMediaUrl)
    } catch (e) {
      console.error(e)
    }
    return events.value.find(e => e.slug === slug) ?? null
  }

  const registerForEvent = async (data: EventRegistrationData) => {
    try {
      const res = await fetchMedusa<{ success: boolean }>('/store/event-registrations', {
        method: 'POST',
        body: {
          event_id: data.eventId,
          name: data.name,
          phone: data.phone,
          email: data.email || undefined,
          quantity: data.quantity,
          message: data.message || undefined,
          source: 'website',
        },
      })

      if (res.success) {
        return { success: true, message: t('events.register.success') }
      }
    } catch (err) {
      return { success: false, message: parseApiError(err, t('events.register.error')) }
    }

    return { success: false, message: t('events.register.error') }
  }

  return { events, upcomingEvents, pastEvents, pending, getBySlug, byTopic, registerForEvent }
}
