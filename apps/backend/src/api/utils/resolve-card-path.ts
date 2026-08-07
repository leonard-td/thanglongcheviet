import { topicPath } from "../../utils/topic-path"
import type CampaignModuleService from "../../modules/campaign/service"

type CardWithTopic = { topic_id: string | null, path: string | null }

/**
 * Cards linked to a campaign_topic (topic_id set) must always show that
 * topic's CURRENT public path, not whatever `path` string was written to the
 * card row when the topic was first picked — otherwise editing a topic's
 * slug/content_type later leaves every card pointing at it stale, both in
 * the admin list and on the live storefront (GET /store/cards feeds
 * apps/web's HomeV3PillarList.vue directly). Called by every route that
 * returns card rows.
 */
export async function resolveCardPaths<T extends CardWithTopic>(
  cards: T[],
  campaignModuleService: CampaignModuleService
): Promise<T[]> {
  const topicIds = [
    ...new Set(cards.map((c) => c.topic_id).filter((id): id is string => !!id)),
  ]
  if (!topicIds.length) return cards

  const topics = await campaignModuleService.listCampaignTopics({ id: topicIds })
  const topicById = new Map(topics.map((t) => [t.id, t]))

  return cards.map((card) => {
    if (!card.topic_id) return card
    const topic = topicById.get(card.topic_id)
    return topic ? { ...card, path: topicPath(topic) } : card
  })
}
