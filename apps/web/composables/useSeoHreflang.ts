const OG_LOCALE_BY_CODE: Record<string, string> = {
  vi: 'vi_VN',
  en: 'en_US',
}

export function useSeoHreflang() {
  const route = useRoute()
  const switchLocalePath = useSwitchLocalePath()
  const { locale, locales } = useI18n()

  // Derived from the incoming request (or window.location on the client) so
  // hreflang links are correct for whichever domain is pointed at this
  // server, instead of one fixed NUXT_PUBLIC_SITE_URL.
  const siteUrl = useRequestURL().origin

  const canonicalUrl = computed(() => `${siteUrl}${route.path}`)

  useSeoMeta({
    ogLocale: () => OG_LOCALE_BY_CODE[locale.value] ?? 'vi_VN',
    ogLocaleAlternate: () =>
      locales.value
        .filter(loc => loc.code !== locale.value)
        .map(loc => OG_LOCALE_BY_CODE[loc.code])
        .filter((value): value is string => Boolean(value)),
  })

  useHead({
    link: computed(() => {
      const alternates: { rel: string, hreflang?: string, href: string }[] = locales.value.map(loc => ({
        rel: 'alternate',
        hreflang: loc.code,
        href: `${siteUrl}${switchLocalePath(loc.code)}`,
      }))

      alternates.push({
        rel: 'alternate',
        hreflang: 'x-default',
        href: `${siteUrl}${switchLocalePath('vi')}`,
      })

      return [
        { rel: 'canonical', href: canonicalUrl.value },
        ...alternates,
      ]
    }),
  })
}
