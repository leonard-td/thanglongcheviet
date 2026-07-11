import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export default async function seedGifts({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModule = container.resolve(Modules.PRODUCT)

  // Check if we already have gift products
  const [existing] = await productModule.listProducts({ handle: ["hop-qua-doanh-nghiep-vip", "set-qua-tang-tinh-hoa"] })
  if (existing) {
    logger.info("Gift products already exist, skipping seed.")
    return
  }

  // Get sales channel
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
  const [salesChannel] = await salesChannelModule.listSalesChannels({ name: "Default Sales Channel" })
  if (!salesChannel) {
    logger.error("No default sales channel found.")
    return
  }

  // Create products
  const { result } = await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Hộp Quà Doanh Nghiệp VIP",
          handle: "hop-qua-doanh-nghiep-vip",
          description: "Bộ quà tặng cao cấp gồm 4 loại trà thượng hạng, vỏ hộp bằng gỗ nguyên khối sang trọng, có thể in logo doanh nghiệp.",
          options: [{ title: "Phân loại", values: ["Gỗ Gõ Đỏ", "Gỗ Sồi"] }],
          variants: [
            {
              title: "Gỗ Gõ Đỏ",
              options: { "Phân loại": "Gỗ Gõ Đỏ" },
              prices: [{ currency_code: "vnd", amount: 1500000 }]
            },
            {
              title: "Gỗ Sồi",
              options: { "Phân loại": "Gỗ Sồi" },
              prices: [{ currency_code: "vnd", amount: 1200000 }]
            }
          ],
          sales_channels: [{ id: salesChannel.id }],
        },
        {
          title: "Set Quà Tặng Tinh Hoa",
          handle: "set-qua-tang-tinh-hoa",
          description: "Sự kết hợp hoàn hảo giữa Trà Đinh Tân Cương và Trà Shan Tuyết cổ thụ, đi kèm bộ ấm chén Bát Tràng.",
          options: [{ title: "Phân loại", values: ["Kèm Ấm Chén", "Chỉ Trà"] }],
          variants: [
            {
              title: "Kèm Ấm Chén",
              options: { "Phân loại": "Kèm Ấm Chén" },
              prices: [{ currency_code: "vnd", amount: 850000 }]
            },
            {
              title: "Chỉ Trà",
              options: { "Phân loại": "Chỉ Trà" },
              prices: [{ currency_code: "vnd", amount: 550000 }]
            }
          ],
          sales_channels: [{ id: salesChannel.id }],
        }
      ]
    }
  })

  logger.info(`Seeded ${result.length} gift products.`)
}
