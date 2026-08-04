import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"

/**
 * Links products missing a shipping profile to the default profile so checkout
 * shipping validation passes (seed scripts omit shipping_profile_id).
 */
export default async function fixProductShippingProfiles({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT)

  const [shippingProfile] = await fulfillmentModule.listShippingProfiles({
    type: "default",
  })
  if (!shippingProfile) {
    logger.warn("fix-product-shipping-profiles: no default shipping profile, skipping.")
    return
  }

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "shipping_profile.id"],
  })

  const missingIds = (products ?? [])
    .filter((p: { id: string; shipping_profile?: { id?: string } | null }) => !p.shipping_profile?.id)
    .map((p: { id: string }) => p.id)

  if (!missingIds.length) {
    logger.info("fix-product-shipping-profiles: all products already linked.")
    return
  }

  await updateProductsWorkflow(container).run({
    input: {
      selector: { id: missingIds },
      update: { shipping_profile_id: shippingProfile.id },
    },
  })

  logger.info(`fix-product-shipping-profiles: linked ${missingIds.length} product(s).`)
}
