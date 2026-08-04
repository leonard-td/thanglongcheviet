/** Slim payloads for storefront list/bootstrap endpoints. */

export function toStoreSiteSettings(row: Record<string, unknown>) {
  return {
    store_name: row.store_name ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    address: row.address ?? null,
    google_map_url: row.google_map_url ?? null,
    open_hours: row.open_hours ?? null,
    facebook_url: row.facebook_url ?? null,
    zalo_url: row.zalo_url ?? null,
    instagram_url: row.instagram_url ?? null,
    hero_images: row.hero_images ?? [],
    about_title: row.about_title ?? null,
    about_thumbnail: row.about_thumbnail ?? null,
    about_content: row.about_content ?? null,
    about_collection_id: row.about_collection_id ?? null,
  }
}

export function toCampaignPostListItem(
  post: Record<string, unknown>,
  topic: { id: string; name: string; slug: string } | null,
) {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    description: post.description ?? null,
    thumbnail: post.thumbnail ?? null,
    publish_at: post.publish_at ?? null,
    source: post.source ?? null,
    topic,
  }
}

export function toCampaignTopicListItem(
  topic: Record<string, unknown>,
  postCount: number,
) {
  return {
    id: topic.id,
    name: topic.name,
    slug: topic.slug,
    rank: topic.rank,
    post_count: postCount,
  }
}

export function toNavigationTree(roots: Array<Record<string, unknown>>) {
  return roots.map((node) => ({
    id: node.id,
    label: node.label,
    url: node.url,
    order: node.order,
    openInNewTab: node.openInNewTab ?? false,
    children: Array.isArray(node.children)
      ? (node.children as Array<Record<string, unknown>>).map((c) => ({
          id: c.id,
          label: c.label,
          url: c.url,
          order: c.order,
          openInNewTab: c.openInNewTab ?? false,
        }))
      : [],
  }))
}
