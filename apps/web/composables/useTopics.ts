export interface Topic {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
}

interface StoreCampaignTopic {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
}

function transformTopic(t: StoreCampaignTopic, resolveUrl: (url: string | null | undefined) => string): Topic {
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    description: t.description,
    image: resolveUrl(t.image) || null,
  }
}

/**
 * Shared fetcher for campaign_topic entities scoped by content_type. Each
 * storefront listing type (bài viết, sản phẩm, sự kiện) has its own "chủ đề"
 * page built on top of this — see useBlogTopics() in useBlog.ts for the
 * post-specific variant (it also carries a post_count the others don't need).
 */
export function useTopicsByType(contentType: 'product' | 'event') {
  const { fetchMedusa } = useMedusaApi()
  const { resolveMediaUrl } = useMediaUrl()

  const { data, pending } = useAsyncData(
    `campaign-topics-${contentType}`,
    async () => {
      try {
        const res = await fetchMedusa<{ campaign_topics: StoreCampaignTopic[] }>(
          `/store/campaign-topics?content_type=${contentType}`,
        )
        return res.campaign_topics ?? []
      } catch (e) {
        console.warn(`Campaign topics (${contentType}) API unavailable`, e)
        return [] as StoreCampaignTopic[]
      }
    },
    { default: () => [] as StoreCampaignTopic[] },
  )

  const topics = computed<Topic[]>(() =>
    (data.value ?? []).map(t => transformTopic(t, resolveMediaUrl)),
  )

  const getTopicBySlug = async (slug: string): Promise<Topic | null> => {
    const found = topics.value.find(t => t.slug === slug)
    if (found) return found

    try {
      const res = await fetchMedusa<{ campaign_topic: StoreCampaignTopic }>(
        `/store/campaign-topics/${encodeURIComponent(slug)}`,
      )
      if (res.campaign_topic) return transformTopic(res.campaign_topic, resolveMediaUrl)
    } catch (e) {
      console.error(e)
    }
    return null
  }

  return { topics, pending, getTopicBySlug }
}
