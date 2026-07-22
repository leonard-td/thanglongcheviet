import type { ApiEnvelope } from '~/utils/storefront'
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
  const { data, status, refresh } = useAsyncData('site-bundle', async () => {
    try {
      const config = useRuntimeConfig()
      const medusaUrl = import.meta.client ? config.public.medusaBackendUrl : (config.medusaBackendUrlServer || config.public.medusaBackendUrl)
      const res = await $fetch<{ site_settings: any }>(`${medusaUrl}/store/site-settings`, {
        headers: {
          'x-publishable-api-key': config.public.medusaPublishableKey
        }
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
            address: remoteSettings.address ? { vi: remoteSettings.address, en: remoteSettings.address } : localFallback.settings.contact.address,
            phone: remoteSettings.phone || localFallback.settings.contact.phone,
            phoneDisplay: remoteSettings.phone || localFallback.settings.contact.phoneDisplay,
            mobile: remoteSettings.phone || localFallback.settings.contact.mobile,
            email: remoteSettings.email || localFallback.settings.contact.email,
          },
          hours: remoteSettings.hours || localFallback.settings.hours,
          social: {
            ...localFallback.settings.social,
            facebook: remoteSettings.facebook_url || localFallback.settings.social.facebook,
            zalo: remoteSettings.zalo_url || localFallback.settings.social.zalo,
            instagram: remoteSettings.instagram_url || localFallback.settings.social.instagram,
          }
        }
      } as SiteBundle
    } catch (err) {
      console.error("Failed to fetch site settings", err)
      return localFallback
    }
  }, {
    default: () => localFallback
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
