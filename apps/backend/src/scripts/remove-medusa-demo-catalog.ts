import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  deleteProductCategoriesWorkflow,
  deleteProductsWorkflow,
} from "@medusajs/medusa/core-flows"

/** Medusa starter demo catalog from initial-data-seed — not used for TLCV. */
const DEMO_PRODUCT_HANDLES = ["t-shirt", "sweatshirt", "shorts", "sweatpants"]
const DEMO_CATEGORY_NAMES = ["Shirts", "Sweatshirts", "Pants", "Merch"]

export default async function removeMedusaDemoCatalog({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModule = container.resolve(Modules.PRODUCT)

  const productIds: string[] = []
  for (const handle of DEMO_PRODUCT_HANDLES) {
    const [product] = await productModule.listProducts({ handle: [handle] })
    if (product) productIds.push(product.id)
  }

  if (productIds.length) {
    await deleteProductsWorkflow(container).run({ input: { ids: productIds } })
    logger.info(`remove-medusa-demo-catalog: deleted ${productIds.length} demo product(s).`)
  } else {
    logger.info("remove-medusa-demo-catalog: no demo products found.")
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: categories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name"],
  })

  const categoryIds = categories
    .filter((c: { name: string }) => DEMO_CATEGORY_NAMES.includes(c.name))
    .map((c: { id: string }) => c.id)

  if (categoryIds.length) {
    await deleteProductCategoriesWorkflow(container).run({ input: categoryIds })
    logger.info(`remove-medusa-demo-catalog: deleted ${categoryIds.length} demo categor(ies).`)
  } else {
    logger.info("remove-medusa-demo-catalog: no demo categories found.")
  }
}
