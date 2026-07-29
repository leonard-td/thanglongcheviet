import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { CARD_MODULE } from "../../../../../modules/card"
import type CardModuleService from "../../../../../modules/card/service"
import { CAMPAIGN_MODULE } from "../../../../../modules/campaign"
import type CampaignModuleService from "../../../../../modules/campaign/service"
import { EVENT_MODULE } from "../../../../../modules/event"
import type EventModuleService from "../../../../../modules/event/service"
import { SITE_SETTINGS_MODULE } from "../../../../../modules/site-settings"
import type SiteSettingsModuleService from "../../../../../modules/site-settings/service"

type UsageEntry = {
  kind:
    | "card"
    | "campaign_post"
    | "campaign_topic"
    | "site_settings"
    | "event"
    | "product"
  id: string
  label: string
}

const PAGE_SIZE = 100

/**
 * GET /admin/media/:id/usage
 *
 * Lists everything that currently references this image, so the admin UI can
 * warn before deletion. Matches both the exact stored URL and its /static/
 * basename (host-independent: dev/prod record the same file under different
 * origins).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cardModuleService: CardModuleService = req.scope.resolve(CARD_MODULE)
  const campaignModuleService: CampaignModuleService =
    req.scope.resolve(CAMPAIGN_MODULE)
  const eventModuleService: EventModuleService =
    req.scope.resolve(EVENT_MODULE)
  const siteSettingsModuleService: SiteSettingsModuleService =
    req.scope.resolve(SITE_SETTINGS_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const media = await cardModuleService.retrieveCardMedia(req.params.id)

  const url = media.url
  const basename = url.split("/static/")[1] ?? null
  const matches = (value: string | null | undefined) => {
    if (!value) return false
    if (value === url) return true
    return basename ? value.includes(basename) : false
  }
  const matchesJson = (value: unknown) => {
    if (value == null) return false
    const serialized = JSON.stringify(value)
    return serialized.includes(url) ||
      Boolean(basename && serialized.includes(basename))
  }

  const usage: UsageEntry[] = []

  let skip = 0
  while (true) {
    const [cards, count] = await cardModuleService.listAndCountCards(
      {},
      { take: PAGE_SIZE, skip }
    )
    for (const card of cards) {
      if (matches(card.image)) {
        const title = card.title as { vi?: string; en?: string } | null
        usage.push({
          kind: "card",
          id: card.id,
          label: title?.vi || title?.en || card.type,
        })
      }
    }
    skip += cards.length
    if (!cards.length || skip >= count) break
  }

  skip = 0
  while (true) {
    const [posts, count] =
      await campaignModuleService.listAndCountCampaignPosts(
        {},
        { take: PAGE_SIZE, skip }
      )
    for (const post of posts) {
      if (matches(post.thumbnail) || matchesJson(post.content)) {
        usage.push({ kind: "campaign_post", id: post.id, label: post.title })
      }
    }
    skip += posts.length
    if (!posts.length || skip >= count) break
  }

  skip = 0
  while (true) {
    const [topics, count] =
      await campaignModuleService.listAndCountCampaignTopics(
        {},
        { take: PAGE_SIZE, skip }
      )
    for (const topic of topics) {
      if (matches(topic.image)) {
        usage.push({ kind: "campaign_topic", id: topic.id, label: topic.name })
      }
    }
    skip += topics.length
    if (!topics.length || skip >= count) break
  }

  skip = 0
  while (true) {
    const [settingsRows, count] =
      await siteSettingsModuleService.listAndCountSiteSettings(
        {},
        { take: PAGE_SIZE, skip }
      )
    for (const settings of settingsRows) {
      if (
        matches(settings.about_thumbnail) ||
        matchesJson(settings.hero_images) ||
        matchesJson(settings.about_content)
      ) {
        usage.push({
          kind: "site_settings",
          id: settings.id,
          label: settings.store_name || "Site settings",
        })
      }
    }
    skip += settingsRows.length
    if (!settingsRows.length || skip >= count) break
  }

  skip = 0
  while (true) {
    const [events, count] = await eventModuleService.listAndCountEvents(
      {},
      { take: PAGE_SIZE, skip }
    )
    for (const event of events) {
      if (matches(event.thumbnail) || matchesJson(event.content)) {
        usage.push({ kind: "event", id: event.id, label: event.title })
      }
    }
    skip += events.length
    if (!events.length || skip >= count) break
  }

  skip = 0
  while (true) {
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "title", "thumbnail", "images.url", "metadata"],
      pagination: { take: PAGE_SIZE, skip },
    })

    for (const product of products) {
      const images = product.images as Array<{ url?: string }> | undefined
      if (
        matches(product.thumbnail) ||
        images?.some((image) => matches(image.url)) ||
        matchesJson(product.metadata)
      ) {
        usage.push({
          kind: "product",
          id: product.id,
          label: product.title,
        })
      }
    }

    skip += products.length
    if (products.length < PAGE_SIZE) break
  }

  res.json({ usage, count: usage.length })
}
