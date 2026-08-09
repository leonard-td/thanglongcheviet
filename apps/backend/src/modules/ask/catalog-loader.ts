/**
 * Shared Medusa → AskCatalogProduct loader (Ask chat + Typesense reindex/sync).
 */

import {
  ContainerRegistrationKeys,
  Modules,
  QueryContext,
} from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import {
  toAskCatalogProduct,
  type AskCatalogProduct,
} from "./catalog-context"

export function mapRawProducts(
  products: Array<Record<string, unknown>>,
  currencyCode: string
): AskCatalogProduct[] {
  return products.map((p) => {
    const variants = (p.variants as Array<Record<string, unknown>>) ?? []
    const first = variants[0]
    const calc = first?.calculated_price as
      | { calculated_amount?: number | null; currency_code?: string }
      | undefined
    const images = (p.images as Array<{ url?: string }>) ?? []
    const categories = (p.categories as Array<{ name?: string }>) ?? []
    const optionsRaw =
      (p.options as Array<{
        title?: string
        values?: Array<{ value?: string }>
      }>) ?? []
    const options: Array<{ name: string; value: string }> = []
    for (const opt of optionsRaw) {
      const name = opt.title ?? ""
      for (const v of opt.values ?? []) {
        if (name && v.value) options.push({ name, value: v.value })
      }
    }

    return toAskCatalogProduct({
      id: String(p.id),
      title: String(p.title ?? ""),
      handle: String(p.handle ?? ""),
      description: (p.description as string | null) ?? null,
      thumbnail: (p.thumbnail as string | null) ?? null,
      imageUrl: images[0]?.url ?? null,
      categoryNames: categories.map((c) => c.name ?? "").filter(Boolean),
      price: Number(calc?.calculated_amount ?? 0),
      currencyCode: (calc?.currency_code || currencyCode).toLowerCase(),
      options,
    })
  })
}

const BASE_FIELDS = [
  "id",
  "title",
  "handle",
  "description",
  "thumbnail",
  "status",
  "images.url",
  "categories.name",
  "options.title",
  "options.values.value",
  "variants.id",
]

const PRICED_FIELDS = [
  ...BASE_FIELDS,
  "variants.calculated_price.calculated_amount",
  "variants.calculated_price.currency_code",
]

async function resolveCurrency(
  container: MedusaContainer
): Promise<{ regionId?: string; currencyCode: string }> {
  const regionModule = container.resolve(Modules.REGION)
  const regions = await regionModule.listRegions({}, { take: 1 })
  const region = regions[0]
  const currencyCode = (
    region?.currency_code ||
    process.env.ASK_CURRENCY_CODE ||
    "vnd"
  ).toLowerCase()
  return { regionId: region?.id, currencyCode }
}

/** Load all published products for Ask / reindex. */
export async function loadAskCatalog(
  container: MedusaContainer
): Promise<AskCatalogProduct[]> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const { regionId, currencyCode } = await resolveCurrency(container)

  try {
    const graph: Record<string, unknown> = {
      entity: "product",
      fields: PRICED_FIELDS,
      filters: { status: "published" },
    }

    if (regionId) {
      graph.context = {
        variants: {
          calculated_price: QueryContext({
            region_id: regionId,
            currency_code: currencyCode,
          }),
        },
      }
    }

    const { data: products } = await query.graph(graph as never)
    return mapRawProducts(
      (products as Array<Record<string, unknown>>) ?? [],
      currencyCode
    )
  } catch (error) {
    logger.warn(
      `ask: priced catalog query failed, falling back without prices: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
    const { data: products } = await query.graph({
      entity: "product",
      fields: BASE_FIELDS,
      filters: { status: "published" },
    } as never)
    return mapRawProducts(
      (products as Array<Record<string, unknown>>) ?? [],
      currencyCode
    )
  }
}

/** Load one product by id for Typesense upsert (published only). */
export async function loadAskCatalogProductById(
  container: MedusaContainer,
  productId: string
): Promise<AskCatalogProduct | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { regionId, currencyCode } = await resolveCurrency(container)

  const graph: Record<string, unknown> = {
    entity: "product",
    fields: PRICED_FIELDS,
    filters: { id: productId, status: "published" },
  }

  if (regionId) {
    graph.context = {
      variants: {
        calculated_price: QueryContext({
          region_id: regionId,
          currency_code: currencyCode,
        }),
      },
    }
  }

  try {
    const { data: products } = await query.graph(graph as never)
    const list = mapRawProducts(
      (products as Array<Record<string, unknown>>) ?? [],
      currencyCode
    )
    return list[0] ?? null
  } catch {
    const { data: products } = await query.graph({
      entity: "product",
      fields: BASE_FIELDS,
      filters: { id: productId, status: "published" },
    } as never)
    const list = mapRawProducts(
      (products as Array<Record<string, unknown>>) ?? [],
      currencyCode
    )
    return list[0] ?? null
  }
}
