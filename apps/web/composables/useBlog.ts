import type { BlogPost, BlogTopic } from '~/utils/storefront'
import { FALLBACK_POST_IMAGE } from '~/utils/storefront'
import { tiptapFirstImage, tiptapToHtml, tiptapToText } from '~/utils/tiptap'
import fallbackPosts from '~/content/blog.json'

export type { BlogPost, BlogTopic } from '~/utils/storefront'

interface CampaignPost {
  id: string
  title: string
  slug: string
  content: unknown
  description?: string | null
  thumbnail?: string | null
  topic?: { id: string, name: string, slug: string } | null
  publish_at: string | null
  created_at?: string
  source?: string | null
  seo_title?: string | null
  seo_description?: string | null
  seo_keywords?: string | null
}

interface CampaignTopic {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  post_count?: number
}

function transformCampaignPost(p: CampaignPost, resolveUrl: (url: string | null | undefined) => string): BlogPost {
  const content = tiptapToHtml(p.content, resolveUrl)
  // Ưu tiên mô tả ngắn do admin nhập; nếu bỏ trống thì rơi về đoạn trích
  // tự động từ nội dung (hành vi cũ, giữ cho các bài viết đã tạo trước đó).
  const excerpt = p.description?.trim() || (() => {
    const plain = tiptapToText(p.content)
    return plain.slice(0, 200) + (plain.length > 200 ? '…' : '')
  })()
  return {
    slug: p.slug,
    title: p.title,
    excerpt,
    content,
    image: resolveUrl(p.thumbnail) || tiptapFirstImage(p.content, resolveUrl) || FALLBACK_POST_IMAGE,
    date: p.publish_at || p.created_at || '',
    author: 'Thăng Long Chè Việt',
    topic: p.topic ? { name: p.topic.name, slug: p.topic.slug } : null,
    source: p.source || null,
    seoTitle: p.seo_title || null,
    seoDescription: p.seo_description || null,
    seoKeywords: p.seo_keywords || null,
  }
}

function transformCampaignTopic(t: CampaignTopic, resolveUrl: (url: string | null | undefined) => string): BlogTopic {
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    description: t.description,
    image: resolveUrl(t.image) || null,
    post_count: t.post_count ?? 0,
  }
}

/**
 * Blog posts come from the Medusa backend's campaign-posts module
 * (GET /store/campaign-posts, content authored with TipTap in the admin).
 * Falls back to the bundled ~/content/blog.json when the API is unreachable
 * or has no published posts yet.
 */
export function useBlog() {
  const { fetchMedusa } = useMedusaApi()
  const { locale } = useI18n()
  const { resolveMediaUrl } = useMediaUrl()

  const localFallback = computed<BlogPost[]>(() =>
    (fallbackPosts as any[]).map(p => ({
      slug: p.slug,
      title: p.title?.[locale.value] ?? p.title?.vi ?? '',
      excerpt: p.excerpt?.[locale.value] ?? p.excerpt?.vi ?? '',
      content: '',
      image: resolveMediaUrl(p.thumbnail) || FALLBACK_POST_IMAGE,
      date: p.date ?? '',
      author: 'Thăng Long Chè Việt',
      topic: null,
    })),
  )

  const { data: postsData, pending } = useAsyncData(
    'campaign-posts',
    async () => {
      try {
        const res = await fetchMedusa<{ campaign_posts: CampaignPost[] }>(
          '/store/campaign-posts?limit=50',
        )
        return res.campaign_posts ?? []
      } catch (e) {
        console.warn('Campaign posts API unavailable, using local fallback', e)
        return [] as CampaignPost[]
      }
    },
    { default: () => [] as CampaignPost[] },
  )

  const posts = computed<BlogPost[]>(() => {
    const fromApi = (postsData.value ?? []).map(p => transformCampaignPost(p, resolveMediaUrl))
    if (fromApi.length >= 2) return fromApi
    if (fromApi.length === 1) {
      const seen = new Set(fromApi.map(p => p.slug))
      const extras = localFallback.value.filter(p => !seen.has(p.slug))
      return [...fromApi, ...extras]
    }
    return localFallback.value
  })

  const latestPosts = computed<BlogPost[]>(() => posts.value.slice(0, 4))

  const getBySlug = async (slug: string): Promise<BlogPost | null> => {
    try {
      const res = await fetchMedusa<{ campaign_post: CampaignPost }>(
        `/store/campaign-posts/${encodeURIComponent(slug)}`,
      )
      if (res.campaign_post) return transformCampaignPost(res.campaign_post, resolveMediaUrl)
    } catch (e) {
      console.error(e)
    }
    // Fallback: the already-listed posts (covers the local JSON fallback too)
    return posts.value.find(p => p.slug === slug) ?? null
  }

  return { posts, latestPosts, pending, getBySlug }
}

/**
 * Topics for grouping blog posts (GET /store/campaign-topics), each with a
 * banner image and a count of currently visible posts.
 */
export function useBlogTopics() {
  const { fetchMedusa } = useMedusaApi()
  const { resolveMediaUrl } = useMediaUrl()

  const { data, pending } = useAsyncData(
    'campaign-topics',
    async () => {
      try {
        const res = await fetchMedusa<{ campaign_topics: CampaignTopic[] }>(
          '/store/campaign-topics',
        )
        return res.campaign_topics ?? []
      } catch (e) {
        console.warn('Campaign topics API unavailable', e)
        return [] as CampaignTopic[]
      }
    },
    { default: () => [] as CampaignTopic[] },
  )

  const topics = computed<BlogTopic[]>(() =>
    (data.value ?? []).map(t => transformCampaignTopic(t, resolveMediaUrl)),
  )

  const getTopicBySlug = async (slug: string): Promise<BlogTopic | null> => {
    const found = topics.value.find(t => t.slug === slug)
    if (found) return found

    try {
      const res = await fetchMedusa<{ campaign_topic: CampaignTopic }>(
        `/store/campaign-topics/${encodeURIComponent(slug)}`,
      )
      if (res.campaign_topic) return transformCampaignTopic(res.campaign_topic, resolveMediaUrl)
    } catch (e) {
      console.error(e)
    }
    return null
  }

  const getPostsByTopicSlug = async (slug: string): Promise<BlogPost[]> => {
    try {
      const res = await fetchMedusa<{ campaign_posts: CampaignPost[] }>(
        `/store/campaign-posts?limit=100&topic_slug=${encodeURIComponent(slug)}`,
      )
      return (res.campaign_posts ?? []).map(p => transformCampaignPost(p, resolveMediaUrl))
    } catch (e) {
      console.warn('Campaign posts by topic unavailable', e)
      return []
    }
  }

  return { topics, pending, getTopicBySlug, getPostsByTopicSlug }
}
