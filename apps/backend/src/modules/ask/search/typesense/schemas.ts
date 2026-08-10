import {
  isTypesenseHybridEnabled,
  readCohereApiKey,
} from "../../config/commerce"
import { COHERE_EMBED_DIMS } from "./cohere-embed"

export type TypesenseProductDoc = {
  id: string
  name: string
  descr: string
  price: number
  /** Selling price; budget filters use this field. */
  sale_price: number
  category: string
  tags: string[]
  in_stock: boolean
  slug: string
  handle: string
  popularity: number
  rating: number
  /** Populated on sync when hybrid enabled. */
  embedding?: number[]
}

export const PRODUCTS_COLLECTION = "products"

type VectorField = {
  name: "embedding"
  type: "float[]"
  num_dim: number
  optional?: true
}

function vectorField(): VectorField | null {
  if (!isTypesenseHybridEnabled() || !readCohereApiKey()) return null
  return {
    name: "embedding",
    type: "float[]",
    num_dim: COHERE_EMBED_DIMS,
    optional: true,
  }
}

const productLexicalFields = [
  { name: "id", type: "string" as const },
  { name: "name", type: "string" as const },
  { name: "descr", type: "string" as const },
  { name: "price", type: "float" as const, facet: true },
  { name: "sale_price", type: "float" as const, facet: true, optional: true },
  { name: "category", type: "string" as const, facet: true },
  { name: "tags", type: "string[]" as const, facet: true, optional: true },
  { name: "in_stock", type: "bool" as const, facet: true },
  { name: "slug", type: "string" as const },
  { name: "handle", type: "string" as const },
  { name: "popularity", type: "int32" as const },
  { name: "rating", type: "float" as const, optional: true },
]

export function buildProductCollectionSchema() {
  const embedding = vectorField()
  return {
    name: PRODUCTS_COLLECTION,
    fields: embedding
      ? [...productLexicalFields, embedding]
      : [...productLexicalFields],
    default_sorting_field: "popularity" as const,
  }
}

export const productCollectionSchema = buildProductCollectionSchema()
