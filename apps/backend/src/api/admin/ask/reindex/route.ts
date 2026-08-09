/**
 * POST /admin/ask/reindex
 *
 * Auth: admin session/bearer (default Medusa admin) OR
 * header `x-search-reindex-token: $SEARCH_REINDEX_TOKEN` when token is set.
 *
 * AUTHENTICATE=false so ops scripts can use the token without an admin cookie;
 * the handler still enforces token OR admin actor.
 */

import type {
  AuthenticatedMedusaRequest,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { loadAskCatalog } from "../../../../modules/ask/catalog-loader"
import { syncTypesenseCatalog } from "../../../../modules/ask/search/typesense/sync"

/** Allow token-based ops without session; authorization checked in POST. */
export const AUTHENTICATE = false

function tokenAuthorized(req: MedusaRequest): boolean {
  const expected = process.env.SEARCH_REINDEX_TOKEN?.trim()
  if (!expected) return false
  const header = req.headers["x-search-reindex-token"]
  const value = Array.isArray(header) ? header[0] : header
  return Boolean(value && value === expected)
}

function hasAdminActor(req: MedusaRequest): boolean {
  const auth = (req as AuthenticatedMedusaRequest).auth_context
  return Boolean(auth?.actor_id)
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if (!tokenAuthorized(req) && !hasAdminActor(req)) {
    res.status(403).json({
      message:
        "Forbidden — admin session required, or set x-search-reindex-token matching SEARCH_REINDEX_TOKEN",
    })
    return
  }

  const host = process.env.TYPESENSE_HOST?.trim()
  const apiKey = process.env.TYPESENSE_API_KEY?.trim()
  if (!host || !apiKey) {
    res.status(500).json({
      message: "TYPESENSE_HOST and TYPESENSE_API_KEY must be configured",
    })
    return
  }

  try {
    const products = await loadAskCatalog(req.scope)
    const result = await syncTypesenseCatalog({ products })
    res.status(200).json({
      ok: true,
      products: result.products,
      hybrid: process.env.TYPESENSE_HYBRID ?? "0",
      searchSource: process.env.SEARCH_SOURCE ?? "lib",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    res.status(500).json({ ok: false, message })
  }
}
