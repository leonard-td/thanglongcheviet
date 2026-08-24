/**
 * Storefront view over the admin-managed site settings
 * (`GET /store/site-settings`, see useSiteSettings.ts). Every field here is
 * editable in Admin > Cài đặt > Thông tin cửa hàng — there is no local
 * fallback content, so an unset field renders empty and the consuming
 * template is expected to hide that row.
 */
export function useSettings() {
  const { settings: raw } = useSiteSettings()

  const site = computed(() => ({
    name: raw.value?.store_name || '',
    tagline: raw.value?.tagline || '',
    description: raw.value?.description || '',
  }))

  const contact = computed(() => ({
    address: raw.value?.address || '',
    phone: raw.value?.phone || '',
    hotline: raw.value?.hotline || '',
    email: raw.value?.email || '',
    mapEmbed: raw.value?.google_map_url || '',
  }))

  const websiteUrl = computed(() => raw.value?.website_url || '')

  /**
   * Admin stores opening hours as one free-text line (e.g. "T2–T6: 08:00–21:00,
   * T7–CN: 08:00–22:00"). Split on commas so each entry gets its own row, and
   * on the first colon so a "days: time" entry keeps its two-column layout.
   */
  const hours = computed(() => {
    const rawHours = raw.value?.open_hours?.trim()
    if (!rawHours) return [] as { days: string, time: string }[]

    return rawHours
      .split(',')
      .map(part => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf(':')
        // A leading "HH:MM" has no label, so only treat the colon as a
        // days/time separator when there is text in front of it.
        if (separator > 0 && !/^\d/.test(part)) {
          return {
            days: part.slice(0, separator).trim(),
            time: part.slice(separator + 1).trim(),
          }
        }
        return { days: part, time: '' }
      })
  })

  const social = computed(() => ({
    facebook: raw.value?.facebook_url || '',
    zalo: raw.value?.zalo_url || '',
    instagram: raw.value?.instagram_url || '',
  }))

  return { site, contact, websiteUrl, hours, social }
}
