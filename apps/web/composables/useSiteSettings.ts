import { tiptapToHtml } from '~/utils/tiptap'

export interface SiteSettingsDto {
  id: string
  store_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  google_map_url: string | null
  open_hours: string | null
  facebook_url: string | null
  zalo_url: string | null
  instagram_url: string | null
  hero_images: string[] | null
  about_title: string | null
  about_thumbnail: string | null
  about_content: unknown
  about_collection_id: string | null
}

/**
 * About page + hero fields from Medusa. Populated by useSiteBundle bootstrap;
 * falls back to a dedicated fetch when needed.
 */
export function useSiteSettings() {
  const { fetchMedusa } = useMedusaApi()
  const { resolveMediaUrl } = useMediaUrl()
  const dtoState = useState<SiteSettingsDto | null>('site-settings-dto', () => null)

  const { pending } = useAsyncData(
    'site-settings-dto',
    async () => {
      if (dtoState.value) return dtoState.value
      try {
        const res = await fetchMedusa<{ site_settings: SiteSettingsDto }>(
          '/store/site-settings',
        )
        dtoState.value = res.site_settings ?? null
        return dtoState.value
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Site settings API unavailable', e)
        }
        return null
      }
    },
    { default: () => null },
  )

  const settings = computed(() => dtoState.value)

  const heroImages = computed(() =>
    (settings.value?.hero_images ?? [])
      .map(url => resolveMediaUrl(url))
      .filter(Boolean),
  )

  const aboutTitle = computed(() => settings.value?.about_title || '')
  const aboutThumbnail = computed(
    () => resolveMediaUrl(settings.value?.about_thumbnail) || '',
  )
  const aboutHtml = computed(() =>
    settings.value?.about_content
      ? tiptapToHtml(settings.value.about_content, resolveMediaUrl)
      : '',
  )
  const aboutCollectionId = computed(
    () => settings.value?.about_collection_id || null,
  )

  return {
    settings,
    pending,
    heroImages,
    aboutTitle,
    aboutThumbnail,
    aboutHtml,
    aboutCollectionId,
  }
}
