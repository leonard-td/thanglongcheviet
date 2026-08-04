import type { SiteSettingsDto } from '~/composables/useSiteSettings'
import fallbackSettings from '~/content/settings.json'
import fallbackTeam from '~/content/team.json'
import fallbackServices from '~/content/services.json'
import fallbackGallery from '~/content/gallery.json'
import fallbackTestimonials from '~/content/testimonials.json'

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

export function useSiteBundle() {
  const navigations = useState<Array<{ id: string; label?: string; url: string; order: number; children?: unknown[] }>>(
    'store-navigations',
    () => [],
  )

  const { data, status, refresh } = useAsyncData('site-bundle', async () => {
    try {
      const config = useRuntimeConfig()
      const medusaUrl = import.meta.client ? config.public.medusaBackendUrl : (config.medusaBackendUrlServer || config.public.medusaBackendUrl)
      const headers: Record<string, string> = {}
      if (config.public.medusaPublishableKey) {
        headers['x-publishable-api-key'] = config.public.medusaPublishableKey
      }

      const res = await $fetch<{ site_settings: Record<string, unknown>; navigations?: typeof navigations.value }>(
        `${medusaUrl}/store/storefront-bootstrap`,
        { headers },
      )

      const remoteSettings = res?.site_settings || {}
      if (res?.navigations?.length) {
        navigations.value = res.navigations as typeof navigations.value
      }

      const dtoState = useState<SiteSettingsDto | null>('site-settings-dto', () => null)
      if (remoteSettings && Object.keys(remoteSettings).length) {
        dtoState.value = { id: 'bootstrap', ...remoteSettings } as SiteSettingsDto
      }

      return {
        ...localFallback,
        settings: {
          ...localFallback.settings,
          contact: {
            ...localFallback.settings.contact,
            address: remoteSettings.address ? { vi: remoteSettings.address, en: remoteSettings.address } : localFallback.settings.contact.address,
            phone: (remoteSettings.phone as string) || localFallback.settings.contact.phone,
            phoneDisplay: (remoteSettings.phone as string) || localFallback.settings.contact.phoneDisplay,
            mobile: (remoteSettings.phone as string) || localFallback.settings.contact.mobile,
            email: (remoteSettings.email as string) || localFallback.settings.contact.email,
          },
          hours: localFallback.settings.hours,
          social: {
            ...localFallback.settings.social,
            facebook: (remoteSettings.facebook_url as string) || localFallback.settings.social.facebook,
            zalo: (remoteSettings.zalo_url as string) || localFallback.settings.social.zalo,
            instagram: (remoteSettings.instagram_url as string) || localFallback.settings.social.instagram,
          },
        },
      } as SiteBundle
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Site bootstrap API unavailable', err)
      }
      return localFallback
    }
  }, {
    default: () => localFallback,
  })

  return {
    bundle: computed(() => data.value || localFallback),
    settings: computed(() => (data.value || localFallback).settings),
    navigations,
    team: computed(() => (data.value || localFallback).team),
    services: computed(() => (data.value || localFallback).services),
    gallery: computed(() => (data.value || localFallback).gallery),
    testimonials: computed(() => (data.value || localFallback).testimonials),
    status,
    refresh,
  }
}
