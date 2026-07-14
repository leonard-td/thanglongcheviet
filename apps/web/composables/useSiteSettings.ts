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
 * Thông tin cửa hàng cấu hình trong admin (Settings → Thông tin cửa hàng):
 * liên hệ, ảnh nền trang chủ và bài giới thiệu (GET /store/site-settings).
 */
export function useSiteSettings() {
  const { fetchMedusa } = useMedusaApi()
  const { resolveMediaUrl } = useMediaUrl()

  const { data, pending } = useAsyncData(
    'site-settings',
    async () => {
      try {
        const res = await fetchMedusa<{ site_settings: SiteSettingsDto }>(
          '/store/site-settings',
        )
        return res.site_settings ?? null
      } catch (e) {
        console.warn('Site settings API unavailable', e)
        return null
      }
    },
    { default: () => null },
  )

  const settings = computed(() => data.value)

  const heroImages = computed(() =>
    (data.value?.hero_images ?? [])
      .map(url => resolveMediaUrl(url))
      .filter(Boolean),
  )

  const aboutTitle = computed(() => data.value?.about_title || '')
  const aboutThumbnail = computed(
    () => resolveMediaUrl(data.value?.about_thumbnail) || '',
  )
  const aboutHtml = computed(() =>
    data.value?.about_content
      ? tiptapToHtml(data.value.about_content, resolveMediaUrl)
      : '',
  )
  const aboutCollectionId = computed(
    () => data.value?.about_collection_id || null,
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
