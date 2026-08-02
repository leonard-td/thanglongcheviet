export function useSeoHreflang() {
  const switchLocalePath = useSwitchLocalePath()
  const { locales } = useI18n()

  // Derived from the incoming request (or window.location on the client) so
  // hreflang links are correct for whichever domain is pointed at this
  // server, instead of one fixed NUXT_PUBLIC_SITE_URL.
  const siteUrl = useRequestURL().origin

  useHead({
    link: computed(() => {
      const links: { rel: string, hreflang: string, href: string }[] = locales.value.map((loc) => ({
        rel: 'alternate',
        hreflang: loc.code,
        href: `${siteUrl}${switchLocalePath(loc.code)}`,
      }))

      links.push({
        rel: 'alternate',
        hreflang: 'x-default',
        href: `${siteUrl}${switchLocalePath('vi')}`,
      })

      return links
    }),
  })
}
