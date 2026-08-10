export type CatalogCurrency = "VND" | "USD"

export const DEFAULT_CATALOG_CURRENCY: CatalogCurrency = "VND"
export const DEMO_USD_TO_VND = 25000

export function getCatalogCurrency(): CatalogCurrency {
  const raw = (process.env.ASK_CURRENCY_CODE || "vnd").toUpperCase()
  return raw === "USD" ? "USD" : "VND"
}

export type AskPriceMarker = "usd" | "vnd" | "none"

export function detectAskPriceMarker(rawPrefix: string): AskPriceMarker {
  const s = rawPrefix.toLowerCase()
  if (/\$|usd/.test(s)) return "usd"
  if (/vnd|₫/.test(s)) return "vnd"
  return "none"
}

export function normalizeAskPriceToCatalog(
  amount: number,
  marker: AskPriceMarker,
  catalogCurrency: CatalogCurrency = getCatalogCurrency()
): number {
  if (!Number.isFinite(amount)) return amount
  const catalog = catalogCurrency.toUpperCase() as CatalogCurrency

  if (marker === "usd" && catalog === "VND") {
    return Math.round(amount * DEMO_USD_TO_VND)
  }
  if (marker === "vnd" && catalog === "USD") {
    return Math.max(1, Math.round(amount / DEMO_USD_TO_VND))
  }
  if (marker === "none" && catalog === "VND" && amount > 0 && amount <= 999) {
    return Math.round(amount * DEMO_USD_TO_VND)
  }
  return amount
}

export function productHref(slug: string): string {
  return `/san-pham/${slug}`
}

export function postHref(slug: string): string {
  return `/tin-tuc/${slug}`
}

/** Compatibility with CardDriven `routes.product` / `routes.post`. */
export const routes = {
  product: productHref,
  post: postHref,
}

export function readCohereApiKey(): string | undefined {
  const key = process.env.COHERE_API_KEY?.trim()
  return key || undefined
}

/** Cohere Embed model for Typesense hybrid. */
export const COHERE_EMBED_MODEL = "embed-multilingual-v3.0"

/** Vector weight in Typesense hybrid fusion (0 = keyword-only, 1 = vector-only). */
export const TYPESENSE_HYBRID_ALPHA = 0.5

/** Neighbor pool for vector leg. */
export const TYPESENSE_HYBRID_K = 40

/**
 * Hybrid ON only when TYPESENSE_HYBRID=1|true|on **and** COHERE_API_KEY is set.
 */
export function isTypesenseHybridEnabled(): boolean {
  const flag = process.env.TYPESENSE_HYBRID?.trim().toLowerCase()
  if (flag !== "1" && flag !== "true" && flag !== "on") return false
  return Boolean(readCohereApiKey())
}
