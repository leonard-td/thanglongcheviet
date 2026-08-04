import { localText } from '~/utils/storefront'

export function useSettings() {
  const { locale } = useI18n()
  const { settings: settingsData } = useSiteBundle()

  const localizedText = (field: Record<string, string> | undefined) =>
    localText(field, locale.value)

  const siteInfo = computed(() => settingsData.value.site ?? {})

  const site = computed(() => ({
    name: localizedText(siteInfo.value.name),
    tagline: localizedText(siteInfo.value.tagline),
    description: localizedText(siteInfo.value.description),
  }))

  const contact = computed(() => settingsData.value.contact)

  const hours = computed(() =>
    settingsData.value.hours.map(h => ({
      days: localizedText(h.days),
      time: h.time,
    })),
  )

  const social = computed(() => settingsData.value.social)

  const heroSlides = computed(() =>
    settingsData.value.hero.slides.map(slide => ({
      ...slide,
      imageAlt: localizedText(slide.imageAlt),
      heading: localizedText(slide.heading),
      subheading: localizedText(slide.subheading),
    })),
  )

  const heroMeta = computed(() => ({
    eyebrow: localizedText(settingsData.value.hero.eyebrow),
    commitment: localizedText(settingsData.value.hero.commitment),
  }))

  const skills = computed(() =>
    settingsData.value.skills.map(s => ({
      ...s,
      label: localizedText(s.label),
    })),
  )

  const discoverServices = computed(() =>
    settingsData.value.discoverServices.map(s => ({
      ...s,
      label: localizedText(s.label),
    })),
  )

  const promo = computed(() => ({
    ...settingsData.value.promo,
    badge: localizedText(settingsData.value.promo.badge),
    heading: localizedText(settingsData.value.promo.heading),
    subheading: localizedText(settingsData.value.promo.subheading),
  }))

  return { settings: settingsData, site, contact, hours, social, heroSlides, heroMeta, skills, discoverServices, promo }
}
