export type { CampaignTopicContentType } from "../../utils/topic-path"
import type { CampaignTopicContentType } from "../../utils/topic-path"

export type CampaignTopic = {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  content_type: CampaignTopicContentType
  is_active: boolean
  rank: number
  created_at?: string
}

export type CampaignTopicsResponse = {
  campaign_topics: CampaignTopic[]
  count: number
  limit: number
  offset: number
}

export type CampaignTopicResponse = {
  campaign_topic: CampaignTopic
}
