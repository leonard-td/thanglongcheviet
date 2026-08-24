export type SiteSettingLocale = "vi" | "en"

export type SiteSettingTranslation = {
  tagline?: string | null
  description?: string | null
}

export type SiteSettingTranslations = Partial<
  Record<SiteSettingLocale, SiteSettingTranslation>
>

type TranslatableSiteSetting = {
  translations?: SiteSettingTranslations | null
}

const localizedFields = ["tagline", "description"] as const

const hasValue = (value: unknown) =>
  value !== undefined && value !== null && value !== ""

/**
 * Returns the brand copy for `locale`, falling back to Vietnamese (the
 * required locale per the project i18n rule) when a field is untranslated.
 */
export const resolveSiteSettingTranslation = (
  settings: TranslatableSiteSetting | null | undefined,
  locale: SiteSettingLocale
): Required<SiteSettingTranslation> => {
  const selected = settings?.translations?.[locale] ?? {}
  const vietnamese = settings?.translations?.vi ?? {}

  return localizedFields.reduce(
    (resolved, field) => {
      resolved[field] = (
        hasValue(selected[field]) ? selected[field] : vietnamese[field] ?? null
      ) as string | null
      return resolved
    },
    {} as Required<SiteSettingTranslation>
  )
}

/** Merges an incoming partial payload over the stored translations. */
export const mergeSiteSettingTranslations = (
  existing: TranslatableSiteSetting | null | undefined,
  incoming: SiteSettingTranslations | undefined
): SiteSettingTranslations => {
  const result: SiteSettingTranslations = { ...(existing?.translations ?? {}) }

  for (const locale of ["vi", "en"] as const) {
    if (incoming?.[locale]) {
      result[locale] = { ...(result[locale] ?? {}), ...incoming[locale] }
    }
  }

  return result
}
