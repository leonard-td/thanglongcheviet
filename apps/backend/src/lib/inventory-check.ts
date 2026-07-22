import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getVariantAvailableQuantities } from "./pg-query"

export type InventoryIssue = {
  variant_id: string
  title?: string
  requested: number
  available: number
}

type CartLine = {
  quantity: number
  variant_id?: string
  variant?: {
    id?: string
    title?: string
    manage_inventory?: boolean
    allow_backorder?: boolean
  }
}

/**
 * Ensure every managed-inventory line item has enough stock before checkout.
 */
export async function validateCartInventory(
  scope: MedusaContainer,
  cartId: string,
): Promise<{ ok: true } | { ok: false; issues: InventoryIssue[] }> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: carts } = await query.graph({
    entity: "cart",
    fields: [
      "id",
      "items.quantity",
      "items.variant_id",
      "items.variant.id",
      "items.variant.title",
      "items.variant.manage_inventory",
      "items.variant.allow_backorder",
    ],
    filters: { id: cartId },
  })

  const cart = carts?.[0] as { items?: CartLine[] } | undefined
  const items = cart?.items ?? []
  if (!items.length) return { ok: true }

  const managed = items.filter(
    (item) =>
      item.variant?.manage_inventory &&
      !item.variant?.allow_backorder &&
      item.variant_id,
  )
  if (!managed.length) return { ok: true }

  const variantIds = [...new Set(managed.map((i) => i.variant_id!))]
  const availableByVariant = await getVariantAvailableQuantities(variantIds)

  const issues: InventoryIssue[] = []
  for (const item of managed) {
    const variantId = item.variant_id!
    const available = availableByVariant.get(variantId) ?? 0
    if (item.quantity > available) {
      issues.push({
        variant_id: variantId,
        title: item.variant?.title,
        requested: item.quantity,
        available,
      })
    }
  }

  return issues.length ? { ok: false, issues } : { ok: true }
}

export async function validateVariantQuantity(
  scope: MedusaContainer,
  variantId: string,
  quantity: number,
): Promise<{ ok: true } | { ok: false; available: number }> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: ["id", "manage_inventory", "allow_backorder"],
    filters: { id: variantId },
  })

  const variant = variants?.[0] as {
    manage_inventory?: boolean
    allow_backorder?: boolean
  } | undefined

  if (!variant?.manage_inventory || variant.allow_backorder) {
    return { ok: true }
  }

  const availableByVariant = await getVariantAvailableQuantities([variantId])
  const available = availableByVariant.get(variantId) ?? 0
  return quantity <= available ? { ok: true } : { ok: false, available }
}
