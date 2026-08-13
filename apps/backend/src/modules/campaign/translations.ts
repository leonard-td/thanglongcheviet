export type CampaignPostLocale = "vi" | "en"

export type CampaignPostTranslation = {
  title?: string
  content?: Record<string, unknown>
  description?: string | null
  source?: string | null
  seo_title?: string | null
  seo_description?: string | null
  seo_keywords?: string | null
}

export type CampaignPostTranslations = Partial<
  Record<CampaignPostLocale, CampaignPostTranslation>
>

type LegacyCampaignPostContent = {
  title?: string
  content?: Record<string, unknown>
  description?: string | null
  source?: string | null
  seo_title?: string | null
  seo_description?: string | null
  seo_keywords?: string | null
  translations?: CampaignPostTranslations | null
}

const localizedFields = [
  "title",
  "content",
  "description",
  "source",
  "seo_title",
  "seo_description",
  "seo_keywords",
] as const

const hasValue = (value: unknown) =>
  value !== undefined && value !== null && value !== ""

const localeContent = (
  post: LegacyCampaignPostContent,
  locale: CampaignPostLocale
): CampaignPostTranslation => post.translations?.[locale] ?? {}

/**
 * Returns the best localized article content. English is the cross-locale
 * fallback, and the legacy flat fields remain the final Vietnamese fallback
 * for rows created before translations existed.
 */
export const resolveCampaignPostTranslation = (
  post: LegacyCampaignPostContent,
  locale: CampaignPostLocale
): CampaignPostTranslation => {
  const selected = localeContent(post, locale)
  const english = localeContent(post, "en")

  return localizedFields.reduce<CampaignPostTranslation>((resolved, field) => {
    const value =
      (hasValue(selected[field]) ? selected[field] : undefined) ??
      (locale !== "en" && hasValue(english[field]) ? english[field] : undefined) ??
      post[field]

    if (value !== undefined) {
      resolved[field] = value as never
    }

    return resolved
  }, {})
}

/**
 * Merges a partial translations payload with the stored data and flat-field
 * compatibility input. Flat fields represent the Vietnamese content.
 */
export const mergeCampaignPostTranslations = (
  existing: LegacyCampaignPostContent,
  incoming: CampaignPostTranslations | undefined,
  legacy: Partial<LegacyCampaignPostContent>
): CampaignPostTranslations => {
  const result: CampaignPostTranslations = {
    ...(existing.translations ?? {}),
    vi: {
      title: existing.translations?.vi?.title ?? existing.title,
      content: existing.translations?.vi?.content ?? existing.content,
      description: existing.translations?.vi?.description ?? existing.description,
      source: existing.translations?.vi?.source ?? existing.source,
      seo_title: existing.translations?.vi?.seo_title ?? existing.seo_title,
      seo_description:
        existing.translations?.vi?.seo_description ?? existing.seo_description,
      seo_keywords: existing.translations?.vi?.seo_keywords ?? existing.seo_keywords,
    },
  }

  for (const locale of ["vi", "en"] as const) {
    if (incoming?.[locale]) {
      result[locale] = {
        ...(result[locale] ?? {}),
        ...incoming[locale],
      }
    }
  }

  const legacyTranslation = localizedFields.reduce<CampaignPostTranslation>(
    (translation, field) => {
      if (legacy[field] !== undefined) {
        translation[field] = legacy[field] as never
      }
      return translation
    },
    {}
  )

  if (Object.keys(legacyTranslation).length) {
    result.vi = {
      ...(result.vi ?? {}),
      ...legacyTranslation,
    }
  }

  return result
}

export const legacyFieldsFromVietnameseTranslation = (
  translations: CampaignPostTranslations
) => {
  const vi = translations.vi ?? translations.en ?? {}

  return {
    title: hasValue(vi.title) ? vi.title : undefined,
    content: vi.content,
    description: vi.description ?? null,
    source: vi.source ?? null,
    seo_title: vi.seo_title ?? null,
    seo_description: vi.seo_description ?? null,
    seo_keywords: vi.seo_keywords ?? null,
  }
}
