import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export default async function seedMoreGifts({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  // Get sales channel
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
  const [salesChannel] = await salesChannelModule.listSalesChannels({ name: "Default Sales Channel" })
  if (!salesChannel) {
    logger.error("No default sales channel found.")
    return
  }

  const newProducts = [
    {
      title: "Hộp Quà Trà Đinh Ngọc (Thái Nguyên)",
      handle: "hop-qua-tra-dinh-ngoc",
      description: "Đỉnh cao của trà Thái Nguyên, thu hái 1 tôm nhỏ xíu. Hương cốm non nồng nàn, vị chát dịu, ngọt hậu sâu.",
      thumbnail: "https://images.unsplash.com/photo-1594910243572-6eb6d649eb72?w=800&q=80",
      images: [{ url: "https://images.unsplash.com/photo-1594910243572-6eb6d649eb72?w=800&q=80" }],
      options: [{ title: "Khối lượng", values: ["200g", "500g"] }],
      variants: [
        { title: "200g", options: { "Khối lượng": "200g" }, prices: [{ currency_code: "vnd", amount: 2500000 }] },
        { title: "500g", options: { "Khối lượng": "500g" }, prices: [{ currency_code: "vnd", amount: 5800000 }] }
      ],
      sales_channels: [{ id: salesChannel.id }],
      status: "published" as any
    },
    {
      title: "Hộp Quà Trà Sen Tây Hồ",
      handle: "hop-qua-tra-sen-tay-ho",
      description: "Quốc ẩm Việt Nam. Trà ướp hương hoa sen Bách Diệp Tây Hồ tự nhiên qua nhiều lần ướp sấy kỳ công.",
      thumbnail: "https://images.unsplash.com/photo-1576092762791-dd9e2220abd4?w=800&q=80",
      images: [{ url: "https://images.unsplash.com/photo-1576092762791-dd9e2220abd4?w=800&q=80" }],
      options: [{ title: "Khối lượng", values: ["100g", "200g"] }],
      variants: [
        { title: "100g", options: { "Khối lượng": "100g" }, prices: [{ currency_code: "vnd", amount: 1500000 }] },
        { title: "200g", options: { "Khối lượng": "200g" }, prices: [{ currency_code: "vnd", amount: 2900000 }] }
      ],
      sales_channels: [{ id: salesChannel.id }],
      status: "published" as any
    },
    {
      title: "Set Quà Trà Shan Tuyết Cổ Thụ",
      handle: "set-qua-tra-shan-tuyet",
      description: "Trà thu hái từ những cây cổ thụ hàng trăm năm tuổi trên núi cao. Nước vàng sánh, vị chát đậm đà.",
      thumbnail: "https://images.unsplash.com/photo-1563822249548-9a72b6353cd1?w=800&q=80",
      images: [{ url: "https://images.unsplash.com/photo-1563822249548-9a72b6353cd1?w=800&q=80" }],
      options: [{ title: "Phân loại", values: ["Bạch Trà", "Hồng Trà"] }],
      variants: [
        { title: "Bạch Trà", options: { "Phân loại": "Bạch Trà" }, prices: [{ currency_code: "vnd", amount: 1200000 }] },
        { title: "Hồng Trà", options: { "Phân loại": "Hồng Trà" }, prices: [{ currency_code: "vnd", amount: 950000 }] }
      ],
      sales_channels: [{ id: salesChannel.id }],
      status: "published" as any
    },
    {
      title: "Hộp Quà Trà Oolong Cao Cấp",
      handle: "hop-qua-tra-oolong",
      description: "Trà Oolong lên men bán phần, viên trà tròn đều. Hương lan thoang thoảng, vị ngọt thanh mát.",
      thumbnail: "https://images.unsplash.com/photo-1582793988951-9aed5509eb97?w=800&q=80",
      images: [{ url: "https://images.unsplash.com/photo-1582793988951-9aed5509eb97?w=800&q=80" }],
      options: [{ title: "Khối lượng", values: ["250g", "500g"] }],
      variants: [
        { title: "250g", options: { "Khối lượng": "250g" }, prices: [{ currency_code: "vnd", amount: 600000 }] },
        { title: "500g", options: { "Khối lượng": "500g" }, prices: [{ currency_code: "vnd", amount: 1150000 }] }
      ],
      sales_channels: [{ id: salesChannel.id }],
      status: "published" as any
    },
    {
      title: "Set Quà Trà Hoa Cúc Mật Ong",
      handle: "set-qua-tra-hoa-cuc",
      description: "Set quà tặng sức khoẻ gồm trà hoa cúc sấy lạnh nguyên bông và mật ong rừng nguyên chất.",
      thumbnail: "https://images.unsplash.com/photo-1576092768241-dec231021465?w=800&q=80",
      images: [{ url: "https://images.unsplash.com/photo-1576092768241-dec231021465?w=800&q=80" }],
      options: [{ title: "Kích thước", values: ["Tiêu chuẩn"] }],
      variants: [
        { title: "Tiêu chuẩn", options: { "Kích thước": "Tiêu chuẩn" }, prices: [{ currency_code: "vnd", amount: 450000 }] }
      ],
      sales_channels: [{ id: salesChannel.id }],
      status: "published" as any
    },
    {
      title: "Hộp Quà Tứ Đại Danh Trà",
      handle: "hop-qua-tu-dai-danh-tra",
      description: "Bộ sưu tập 4 loại trà nổi tiếng nhất Việt Nam: Thái Nguyên, Shan Tuyết, Oolong và Trà Sen. Tặng kèm dụng cụ gắp trà.",
      thumbnail: "https://images.unsplash.com/photo-1571934811356-5cc50f160c9f?w=800&q=80",
      images: [{ url: "https://images.unsplash.com/photo-1571934811356-5cc50f160c9f?w=800&q=80" }],
      options: [{ title: "Hộp", values: ["Hộp Tre", "Hộp Sơn Mài"] }],
      variants: [
        { title: "Hộp Tre", options: { "Hộp": "Hộp Tre" }, prices: [{ currency_code: "vnd", amount: 1800000 }] },
        { title: "Hộp Sơn Mài", options: { "Hộp": "Hộp Sơn Mài" }, prices: [{ currency_code: "vnd", amount: 2500000 }] }
      ],
      sales_channels: [{ id: salesChannel.id }],
      status: "published" as any
    }
  ]

  const { result } = await createProductsWorkflow(container).run({
    input: {
      products: newProducts
    }
  })

  logger.info(`Seeded ${result.length} new gift products with images.`)
}
