import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { validateVariantQuantity } from "../../../../../lib/inventory-check"

/**
 * GET /store/variants/:id/availability?quantity=1
 *
 * Lightweight stock probe before add-to-cart.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const variantId = req.params.id
  const quantity = Math.max(1, Math.floor(Number(req.query.quantity) || 1))

  if (!variantId) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "variant id is required")
  }

  const result = await validateVariantQuantity(req.scope, variantId, quantity)
  if (!result.ok) {
    res.status(409).json({
      ok: false,
      available: result.available,
      requested: quantity,
    })
    return
  }

  res.json({ ok: true, requested: quantity })
}
