import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { syncProductUpsert } from "../lib/ask-search-index"

/**
 * Variant create/update → re-upsert parent product.
 * On delete, graph may miss the row — skip (manual ask:reindex heals).
 */
export default async function productVariantSearchIndexHandler({
  event: { name, data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  try {
    const {
      data: [variant],
    } = await query.graph({
      entity: "variant",
      fields: ["product.id"],
      filters: { id: data.id },
    })

    const productId = variant?.product?.id as string | undefined
    if (!productId) {
      logger.warn(
        `[ask-search-index] ${name} variant ${data.id} has no product.id — skip`
      )
      return
    }
    await syncProductUpsert(container, productId)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    logger.warn(
      `[ask-search-index] ${name} variant ${data.id} resolve failed: ${detail} — skip`
    )
  }
}

export const config: SubscriberConfig = {
  event: [
    "product-variant.created",
    "product-variant.updated",
    "product-variant.deleted",
  ],
}
