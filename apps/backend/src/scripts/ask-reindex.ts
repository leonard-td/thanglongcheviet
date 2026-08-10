/**
 * Full Typesense reindex for Ask catalog.
 *
 * Run: npm run ask:reindex -w @dtc/backend
 * (or: medusa exec ./src/scripts/ask-reindex.ts)
 */

import type { ExecArgs } from "@medusajs/framework/types"
import { loadAskCatalog } from "../modules/ask/catalog-loader"
import { syncTypesenseCatalog } from "../modules/ask/search/typesense/sync"

export default async function askReindex({ container }: ExecArgs) {
  const host = process.env.TYPESENSE_HOST?.trim()
  const apiKey = process.env.TYPESENSE_API_KEY?.trim()
  if (!host || !apiKey) {
    console.error(
      "Missing TYPESENSE_HOST or TYPESENSE_API_KEY. Set them in .env then re-run."
    )
    return
  }

  const products = await loadAskCatalog(container)
  console.log(`ask:reindex loading ${products.length} published product(s)...`)

  const result = await syncTypesenseCatalog({ products })
  console.log(
    `ask:reindex done — products=${result.products} hybrid=${
      process.env.TYPESENSE_HYBRID ?? "0"
    }`
  )
}
