import fallbackSettings from '~/content/settings.json'
import fallbackTeam from '~/content/team.json'
import fallbackServices from '~/content/services.json'
import fallbackGallery from '~/content/gallery.json'
import fallbackTestimonials from '~/content/testimonials.json'
import { getFetchMessage, isPublishableKeyError } from '~/utils/fetch-status'

export interface SiteBundle {
  settings: typeof fallbackSettings
  team: typeof fallbackTeam
  services: typeof fallbackServices
  gallery: typeof fallbackGallery
  testimonials: typeof fallbackTestimonials
}

const localFallback: SiteBundle = {
  settings: fallbackSettings,
  team: fallbackTeam,
  services: fallbackServices,
  gallery: fallbackGallery,
  testimonials: fallbackTestimonials,
}

/**
 * Admin stores hours as a single text string (e.g. "08:00 – 21:00" or
 * "T2–T6: 08:00–21:00, T7–CN: 08:00–22:00"). Parse it into the array
 * shape the footer/contact page expects. Falls back to the local JSON
 * when the string is empty or unparseable.
 */
function parseHours(
  raw: string | null | undefined,
  fallback: { days: { vi: string, en: string }, time: string }[],
) {
  if (!raw || typeof raw !== 'string' || !raw.trim()) return fallback
  return [{ days: { vi: raw.trim(), en: raw.trim() }, time: '' }]
}

/** Avoid spamming the same Store 400 across header/footer/plugin mounts. */
let siteSettingsWarnOnce = false

export function useSiteBundle() {
  const { data, status, refresh } = useAsyncData('site-settings', async () => {
    try {
      const config = useRuntimeConfig()
      const medusaUrl = import.meta.client
        ? config.public.medusaBackendUrl
        : ((config as { medusaBackendUrlServer?: string }).medusaBackendUrlServer || config.public.medusaBackendUrl)
      const res = await $fetch<{ site_settings: any }>(`${medusaUrl}/store/site-settings`, {
        headers: {
          'x-publishable-api-key': config.public.medusaPublishableKey,
        },
      })

      const remoteSettings = res?.site_settings || {}

      // Merge remote settings with local fallback.
      // Remote settings take precedence.
      return {
        ...localFallback,
        settings: {
          ...localFallback.settings,
          contact: {
            ...localFallback.settings.contact,
            address: remoteSettings.address
              ? { vi: remoteSettings.address, en: remoteSettings.address }
              : localFallback.settings.contact.address,
            phone: remoteSettings.phone || localFallback.settings.contact.phone,
            phoneDisplay: remoteSettings.phone || localFallback.settings.contact.phoneDisplay,
            mobile: localFallback.settings.contact.mobile,
            email: remoteSettings.email || localFallback.settings.contact.email,
            mapEmbed: remoteSettings.google_map_url || localFallback.settings.contact.mapEmbed,
          },
          hours: parseHours(remoteSettings.open_hours, localFallback.settings.hours),
          social: {
            ...localFallback.settings.social,
            facebook: remoteSettings.facebook_url || localFallback.settings.social.facebook,
            zalo: remoteSettings.zalo_url || localFallback.settings.social.zalo,
            instagram: remoteSettings.instagram_url || localFallback.settings.social.instagram,
          },
        },
      } as SiteBundle
    }
    catch (err) {
      if (import.meta.dev && !siteSettingsWarnOnce) {
        siteSettingsWarnOnce = true
        const hint = isPublishableKeyError(err)
          ? 'Publishable API key missing/invalid — using local settings fallback. Run setup-web-integration.mjs.'
          : getFetchMessage(err) || err
        console.warn('[site-settings]', hint)
      }
      return localFallback
    }
  }, {
    default: () => localFallback,
  })

  return {
    bundle: computed(() => data.value || localFallback),
    settings: computed(() => (data.value || localFallback).settings),
    team: computed(() => (data.value || localFallback).team),
    services: computed(() => (data.value || localFallback).services),
    gallery: computed(() => (data.value || localFallback).gallery),
    testimonials: computed(() => (data.value || localFallback).testimonials),
    status,
    refresh
  }
}
