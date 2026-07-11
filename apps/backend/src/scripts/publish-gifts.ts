import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export default async function publishGifts({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModule = container.resolve(Modules.PRODUCT)

  const products = await productModule.listProducts({ handle: ["hop-qua-doanh-nghiep-vip", "set-qua-tang-tinh-hoa"] })
  
  if (products.length === 0) {
    logger.info("No gift products found.")
    return
  }

  const { result } = await updateProductsWorkflow(container).run({
    input: {
      products: products.map(p => ({
        id: p.id,
        status: "published" as any
      }))
    }
  })

  logger.info(`Published ${result.length} gift products.`)
}
