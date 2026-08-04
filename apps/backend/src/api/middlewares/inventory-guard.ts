import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { validateCartInventory } from "../../lib/inventory-check"

/** Block cart completion when managed inventory is insufficient. */
export async function inventoryGuardMiddleware(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction,
) {
  const cartId = req.params?.id
  if (!cartId) {
    next()
    return
  }

  const result = await validateCartInventory(req.scope, cartId)
  if (!result.ok) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "One or more items are out of stock or exceed available quantity",
    )
  }

  next()
}
