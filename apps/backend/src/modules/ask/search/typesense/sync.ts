import type { AskCatalogProduct } from "../../catalog-context"
import {
  isTypesenseHybridEnabled,
  readCohereApiKey,
} from "../../config/commerce"
import { createTypesenseClient } from "./client"
import {
  embedTextsCohere,
  productEmbedText,
} from "./cohere-embed"
import {
  PRODUCTS_COLLECTION,
  buildProductCollectionSchema,
  type TypesenseProductDoc,
} from "./schemas"

const EMBED_BATCH = 32

export type IndexSyncResult = {
  products: number
}

export function toProductDoc(product: AskCatalogProduct): TypesenseProductDoc {
  const selling = product.price
  return {
    id: product.id,
    name: product.title,
    descr: product.description,
    price: selling,
    sale_price: selling,
    category: product.category,
    tags: product.categoryNames.filter(Boolean),
    in_stock: product.inStock,
    slug: product.slug,
    handle: product.handle,
    popularity: 0,
    rating: 0,
  }
}

type FieldDef = { name: string; type: string; facet?: boolean; optional?: true }

export async function ensureProductCollection(
  client: ReturnType<typeof createTypesenseClient> = createTypesenseClient()
): Promise<void> {
  const schema = buildProductCollectionSchema()
  const wantsEmbedding = schema.fields.some((f) => f.name === "embedding")
  try {
    const existing = (await client.collections(schema.name).retrieve()) as {
      fields?: FieldDef[]
    }
    const have = new Set((existing.fields ?? []).map((f) => f.name))
    const hasEmbedding = have.has("embedding")

    if (wantsEmbedding && !hasEmbedding) {
      await client.collections(schema.name).delete()
      await client.collections().create(schema)
      return
    }

    const missing = schema.fields.filter(
      (f) => f.name !== "id" && f.name !== "embedding" && !have.has(f.name)
    )
    if (missing.length > 0) {
      await client.collections(schema.name).update({ fields: missing })
    }
  } catch (err) {
    const status = (err as { httpStatus?: number }).httpStatus
    const name = (err as { name?: string }).name
    if (status === 404 || name === "ObjectNotFound") {
      await client.collections().create(schema)
      return
    }
    throw err
  }
}

async function attachProductEmbeddings(
  docs: TypesenseProductDoc[],
  apiKey: string
): Promise<TypesenseProductDoc[]> {
  const out: TypesenseProductDoc[] = []
  for (let i = 0; i < docs.length; i += EMBED_BATCH) {
    const batch = docs.slice(i, i + EMBED_BATCH)
    const vectors = await embedTextsCohere(
      batch.map((d) => productEmbedText(d)),
      "search_document",
      apiKey
    )
    for (let j = 0; j < batch.length; j++) {
      out.push({ ...batch[j]!, embedding: vectors[j] })
    }
  }
  return out
}

function typesenseClientForWrite(): ReturnType<typeof createTypesenseClient> {
  const hybrid = isTypesenseHybridEnabled()
  return createTypesenseClient(undefined, {
    connectionTimeoutSeconds: hybrid ? 120 : 3,
  })
}

async function purgeOrphanDocs(
  client: ReturnType<typeof createTypesenseClient>,
  keepIds: readonly string[]
): Promise<void> {
  if (keepIds.length === 0) return
  const keep = new Set(keepIds)
  const pageSize = 100
  let page = 1
  for (;;) {
    const result = (await client
      .collections(PRODUCTS_COLLECTION)
      .documents()
      .search({
        q: "*",
        query_by: "name",
        per_page: pageSize,
        page,
      })) as { hits?: Array<{ document: { id: string } }> }

    const hits = result.hits ?? []
    if (hits.length === 0) break

    const orphans = hits
      .map((h) => h.document.id)
      .filter((id) => !keep.has(id))
    await Promise.all(
      orphans.map((id) =>
        client
          .collections(PRODUCTS_COLLECTION)
          .documents(id)
          .delete()
          .catch(() => undefined)
      )
    )

    if (hits.length < pageSize) break
    if (orphans.length > 0) {
      page = 1
      continue
    }
    page += 1
    if (page > 50) break
  }
}

/** Full catalog reindex into Typesense products collection. */
export async function syncTypesenseCatalog(input: {
  products: readonly AskCatalogProduct[]
  client?: ReturnType<typeof createTypesenseClient>
}): Promise<IndexSyncResult> {
  const hybrid = isTypesenseHybridEnabled()
  const apiKey = readCohereApiKey()
  const client =
    input.client ??
    createTypesenseClient(undefined, {
      connectionTimeoutSeconds: hybrid ? 120 : 3,
    })

  await ensureProductCollection(client)

  let productDocs = input.products.map(toProductDoc)
  if (hybrid && apiKey) {
    productDocs = await attachProductEmbeddings(productDocs, apiKey)
  }

  if (productDocs.length > 0) {
    await client
      .collections(PRODUCTS_COLLECTION)
      .documents()
      .import(productDocs, { action: "upsert" })
  }

  await purgeOrphanDocs(
    client,
    productDocs.map((d) => d.id)
  )

  return { products: productDocs.length }
}

/** Upsert one product document (optional Cohere embed when hybrid ON). */
export async function upsertTypesenseProduct(
  product: AskCatalogProduct,
  client?: ReturnType<typeof createTypesenseClient>
): Promise<void> {
  const ts = client ?? typesenseClientForWrite()
  await ensureProductCollection(ts)

  const hybrid = isTypesenseHybridEnabled()
  const apiKey = readCohereApiKey()

  let docs = [toProductDoc(product)]
  if (hybrid && apiKey) {
    docs = await attachProductEmbeddings(docs, apiKey)
  }
  await ts.collections(PRODUCTS_COLLECTION).documents().upsert(docs[0]!)
}

/** Delete one product document. Missing docs are ignored. */
export async function deleteTypesenseProduct(
  id: string,
  client?: ReturnType<typeof createTypesenseClient>
): Promise<void> {
  const ts = client ?? typesenseClientForWrite()
  try {
    await ensureProductCollection(ts)
    await ts.collections(PRODUCTS_COLLECTION).documents(id).delete()
  } catch (err) {
    const status = (err as { httpStatus?: number }).httpStatus
    const name = (err as { name?: string }).name
    if (status === 404 || name === "ObjectNotFound") return
    throw err
  }
}
