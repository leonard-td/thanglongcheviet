import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { validateCartInventory } from "../../../../../lib/inventory-check"

/**
 * POST /store/carts/:id/validate-inventory
 *
 * Pre-checkout stock check for managed-inventory variants.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const cartId = req.params.id
  if (!cartId) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "cart id is required")
  }

  const result = await validateCartInventory(req.scope, cartId)
  if (!result.ok) {
    res.status(409).json({ ok: false, issues: result.issues })
    return
  }

  res.json({ ok: true })
}
