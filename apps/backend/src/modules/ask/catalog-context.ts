/**
 * In-process Ask catalog — set by ask.service before answerQuestion.
 */

export type AskCatalogProduct = {
  id: string
  title: string
  /** Medusa handle — used as storefront slug */
  handle: string
  slug: string
  description: string
  category: string
  categoryNames: string[]
  price: number
  currencyCode: string
  image: string
  inStock: boolean
  /** Option title -> values present on product */
  options: Array<{ name: string; value: string }>
}

let catalog: AskCatalogProduct[] = []

export function setAskCatalog(products: AskCatalogProduct[]): void {
  catalog = products
}

export function getAskCatalog(): readonly AskCatalogProduct[] {
  return catalog
}

/** Async alias matching CardDriven product.service.listProducts. */
export async function listProducts(): Promise<AskCatalogProduct[]> {
  return [...catalog]
}

export function toAskCatalogProduct(input: {
  id: string
  title: string
  handle: string
  description?: string | null
  thumbnail?: string | null
  imageUrl?: string | null
  categoryNames?: string[]
  price: number
  currencyCode: string
  options?: Array<{ name: string; value: string }>
}): AskCatalogProduct {
  const categoryNames = input.categoryNames ?? []
  return {
    id: input.id,
    title: input.title,
    handle: input.handle,
    slug: input.handle,
    description: input.description ?? "",
    category: categoryNames.join(" "),
    categoryNames,
    price: input.price,
    currencyCode: input.currencyCode,
    // Prefer real media; empty string → Ask UI hides broken <img>.
    image: input.thumbnail || input.imageUrl || "",
    inStock: true,
    options: input.options ?? [],
  }
}
