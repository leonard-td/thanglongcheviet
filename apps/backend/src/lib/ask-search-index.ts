/**
 * In-process Typesense upsert/delete for Medusa product CUD (no Next BFF).
 * Failures are logged — never throw into Admin write path.
 */

import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { loadAskCatalogProductById } from "../modules/ask/catalog-loader"
import {
  deleteTypesenseProduct,
  upsertTypesenseProduct,
} from "../modules/ask/search/typesense/sync"

function shouldSyncSearchIndex(): boolean {
  const raw = process.env.SEARCH_SOURCE?.trim().toLowerCase()
  // Sync whenever Typesense is configured as primary OR hybrid/env present —
  // keep index warm even if ops temporarily set SEARCH_SOURCE=lib.
  return Boolean(
    process.env.TYPESENSE_HOST?.trim() && process.env.TYPESENSE_API_KEY?.trim()
  ) || raw === "typesense"
}

type LoggerLike = {
  info: (msg: string) => void
  warn: (msg: string) => void
  error: (msg: string) => void
}

export async function syncProductUpsert(
  container: MedusaContainer,
  productId: string
): Promise<void> {
  const logger = container.resolve(
    ContainerRegistrationKeys.LOGGER
  ) as LoggerLike

  if (!shouldSyncSearchIndex()) {
    logger.info(
      `[ask-search-index] SKIP upsert product/${productId} (Typesense not configured)`
    )
    return
  }

  try {
    const product = await loadAskCatalogProductById(container, productId)
    if (!product) {
      // Draft / deleted / unpublished → remove from index if present
      await deleteTypesenseProduct(productId)
      logger.info(
        `[ask-search-index] delete (not published) product/${productId}`
      )
      return
    }
    await upsertTypesenseProduct(product)
    logger.info(`[ask-search-index] upsert product/${productId} ok`)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    logger.error(
      `[ask-search-index] upsert product/${productId} failed: ${detail}`
    )
  }
}

export async function syncProductDelete(
  container: MedusaContainer,
  productId: string
): Promise<void> {
  const logger = container.resolve(
    ContainerRegistrationKeys.LOGGER
  ) as LoggerLike

  if (!shouldSyncSearchIndex()) {
    logger.info(
      `[ask-search-index] SKIP delete product/${productId} (Typesense not configured)`
    )
    return
  }

  try {
    await deleteTypesenseProduct(productId)
    logger.info(`[ask-search-index] delete product/${productId} ok`)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    logger.error(
      `[ask-search-index] delete product/${productId} failed: ${detail}`
    )
  }
}
