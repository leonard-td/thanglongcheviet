import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { CAMPAIGN_MODULE } from "../../modules/campaign"
import type CampaignModuleService from "../../modules/campaign/service"
import { EVENT_MODULE } from "../../modules/event"
import type EventModuleService from "../../modules/event/service"
import { parseNavUrl, type NavLinkType } from "../../modules/navigation/nav-link-resolver"

export type NavThumbnailInfo = {
  link_type: NavLinkType | null
  resolved_thumbnail: string | null
}

type NavItemLike = { id: string; url: string }

const EMPTY_INFO: NavThumbnailInfo = { link_type: null, resolved_thumbnail: null }

/**
 * Batch-resolves a "preview" thumbnail per navigation item by parsing its
 * `url` (see nav-link-resolver.ts) and looking up the matching product /
 * category / collection / post / event / topic. Used by both the admin
 * preview (/admin/navigations*) and the public /store/navigations route so
 * the two never disagree about what a given URL points to.
 */
export async function resolveNavThumbnails(
  container: MedusaContainer,
  items: NavItemLike[]
): Promise<Map<string, NavThumbnailInfo>> {
  const result = new Map<string, NavThumbnailInfo>()

  const bySlug: Record<NavLinkType, Map<string, string[]>> = {
    product: new Map(),
    product_category: new Map(),
    product_collection: new Map(),
    product_topic: new Map(),
    post: new Map(),
    post_topic: new Map(),
    event: new Map(),
    event_topic: new Map(),
  }

  for (const item of items) {
    const parsed = parseNavUrl(item.url)
    if (!parsed) {
      result.set(item.id, EMPTY_INFO)
      continue
    }

    result.set(item.id, { link_type: parsed.type, resolved_thumbnail: null })
    const bucket = bySlug[parsed.type]
    const ids = bucket.get(parsed.slug) ?? []
    ids.push(item.id)
    bucket.set(parsed.slug, ids)
  }

  const setAll = (type: NavLinkType, slug: string, thumbnail: string | null) => {
    const ids = bySlug[type].get(slug)
    ids?.forEach((id) => result.set(id, { link_type: type, resolved_thumbnail: thumbnail }))
  }

  const productSlugs = [...bySlug.product.keys()]
  const categorySlugs = [...bySlug.product_category.keys()]
  const collectionSlugs = [...bySlug.product_collection.keys()]

  if (productSlugs.length || categorySlugs.length || collectionSlugs.length) {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const metaThumbnailOf = (metadata: Record<string, unknown> | null | undefined) =>
      typeof metadata?.thumbnail === "string" ? (metadata.thumbnail as string) : null

    if (productSlugs.length) {
      const { data: products } = await query.graph({
        entity: "product",
        fields: ["handle", "thumbnail"],
        filters: { handle: productSlugs },
      })
      products.forEach((p) => setAll("product", p.handle!, p.thumbnail ?? null))
    }

    if (categorySlugs.length) {
      const { data: categories } = await query.graph({
        entity: "product_category",
        fields: ["handle", "metadata", "products.thumbnail"],
        filters: { handle: categorySlugs },
      })
      categories.forEach((c) =>
        setAll(
          "product_category",
          c.handle!,
          metaThumbnailOf(c.metadata) ?? c.products?.[0]?.thumbnail ?? null
        )
      )
    }

    if (collectionSlugs.length) {
      const { data: collections } = await query.graph({
        entity: "product_collection",
        fields: ["handle", "metadata", "products.thumbnail"],
        filters: { handle: collectionSlugs },
      })
      collections.forEach((c) =>
        setAll(
          "product_collection",
          c.handle!,
          metaThumbnailOf(c.metadata) ?? c.products?.[0]?.thumbnail ?? null
        )
      )
    }
  }

  const postSlugs = [...bySlug.post.keys()]
  const topicSlugs = [
    ...bySlug.product_topic.keys(),
    ...bySlug.post_topic.keys(),
    ...bySlug.event_topic.keys(),
  ]

  if (postSlugs.length || topicSlugs.length) {
    const campaignService: CampaignModuleService = container.resolve(CAMPAIGN_MODULE)

    if (postSlugs.length) {
      const posts = await campaignService.listCampaignPosts({ slug: postSlugs })
      posts.forEach((p) => setAll("post", p.slug, p.thumbnail ?? null))
    }

    if (topicSlugs.length) {
      const topics = await campaignService.listCampaignTopics({ slug: topicSlugs })
      topics.forEach((topic) => {
        const type: NavLinkType =
          topic.content_type === "product"
            ? "product_topic"
            : topic.content_type === "event"
              ? "event_topic"
              : "post_topic"
        setAll(type, topic.slug, topic.image ?? null)
      })
    }
  }

  const eventSlugs = [...bySlug.event.keys()]
  if (eventSlugs.length) {
    const eventService: EventModuleService = container.resolve(EVENT_MODULE)
    const events = await eventService.listEvents({ slug: eventSlugs })
    events.forEach((e) => setAll("event", e.slug, e.thumbnail ?? null))
  }

  return result
}

type NavTreeNodeLike = NavItemLike & {
  thumbnail?: string | null
  children?: NavTreeNodeLike[]
}

function flattenTree(nodes: NavTreeNodeLike[], out: NavItemLike[] = []) {
  for (const node of nodes) {
    out.push({ id: node.id, url: node.url })
    if (node.children?.length) {
      flattenTree(node.children, out)
    }
  }
  return out
}

/**
 * Attaches `link_type` + `resolved_thumbnail` to every node of a navigation
 * tree (or flat list) in place, returning the same array for convenience.
 * `thumbnail` (the manual override, if set) always wins on the storefront —
 * only the admin preview needs both values to show which one is "live".
 */
export async function attachNavThumbnails<T extends NavTreeNodeLike>(
  container: MedusaContainer,
  nodes: T[]
): Promise<Array<T & NavThumbnailInfo>> {
  const flat = flattenTree(nodes)
  const infoById = await resolveNavThumbnails(container, flat)

  const apply = (node: NavTreeNodeLike): T & NavThumbnailInfo => {
    const info = infoById.get(node.id) ?? EMPTY_INFO
    return {
      ...(node as T),
      link_type: info.link_type,
      resolved_thumbnail: info.resolved_thumbnail,
      children: node.children?.map(apply),
    }
  }

  return nodes.map(apply)
}
