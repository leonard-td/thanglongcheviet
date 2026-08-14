import type { JSONContent } from "@tiptap/core"

export type CampaignPostContent = JSONContent

export type CampaignPostLocale = "vi" | "en"

export type CampaignPostTranslation = {
  title?: string
  content?: CampaignPostContent
  description?: string | null
  source?: string | null
  seo_title?: string | null
  seo_description?: string | null
  seo_keywords?: string | null
}

export type CampaignPostTranslations = Partial<
  Record<CampaignPostLocale, CampaignPostTranslation>
>

export type CampaignPost = {
  id: string
  title: string
  slug: string
  content: CampaignPostContent
  translations?: CampaignPostTranslations | null
  description: string | null
  thumbnail: string | null
  topic_id: string | null
  is_active: boolean
  publish_at: string | null
  unpublish_at: string | null
  source: string | null
  seo_title: string | null
  seo_description: string | null
  seo_keywords: string | null
  created_at?: string
}

export type CampaignPostsResponse = {
  campaign_posts: CampaignPost[]
  count: number
  limit: number
  offset: number
}

export type CampaignPostResponse = {
  campaign_post: CampaignPost
}

export type CampaignPostFormValues = {
  title: string
  slug: string
  description: string | null
  thumbnail: string | null
  topic_id: string | null
  is_active: boolean
  publish_at: string | null
  unpublish_at: string | null
  source: string | null
  seo_title: string | null
  seo_description: string | null
  seo_keywords: string | null
  content: CampaignPostContent
  translations: CampaignPostTranslations
}
