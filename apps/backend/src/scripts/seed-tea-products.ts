import {
  createProductsWorkflow,
  deleteProductsWorkflow,
  updateProductsWorkflow,
  createProductCategoriesWorkflow,
} from "@medusajs/medusa/core-flows"
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import fs from "node:fs"
import path from "node:path"

const IMAGE_DIR = path.join(__dirname, "..", "image-thanglong-tea")

const CATEGORY_HANDLE = "thang-long-che-viet"
const CATEGORY_NAME = "Thăng Long Chè Việt"

// Leftover create-medusa-app starter demo products — never real catalog data.
const DEMO_PRODUCT_HANDLES = ["t-shirt", "sweatpants", "sweatshirt", "shorts"]

type TeaDef = {
  title: string
  handle: string
  description: string
  /** Filenames under image-thanglong-tea/, first one becomes the thumbnail. */
  images: string[]
}

const TEAS: TeaDef[] = [
  {
    title: "Chè Tôm",
    handle: "che-tom",
    description: "Chè Tôm Thăng Long Chè Việt — hộp quà gồm 10 gói nhỏ 10g, đóng gói thủ công.",
    images: ["che_tom.jpg", "che_tom_ban_le.jpg"],
  },
  {
    title: "Chè Ướp Gạo Sen",
    handle: "che-uop-gao-sen",
    description: "Chè ướp hương gạo sen Thăng Long Chè Việt — hộp quà gồm 10 gói nhỏ 10g.",
    images: ["che_uop_gao_sen.jpg", "che_uop_gao_sen_ban_le.jpg", "che_uop_gao_sen_ban_le (2).jpg"],
  },
  {
    title: "Chè Ướp Hoa Bưởi",
    handle: "che-uop-hoa-buoi",
    description: "Chè ướp hương hoa bưởi Thăng Long Chè Việt — hộp quà gồm 10 gói nhỏ 10g.",
    images: ["che_uop_hoa_buoi.jpg", "che_uop_hoa_buoi_ban_le.jpg"],
  },
  {
    title: "Chè Ướp Hoa Mộc Hương",
    handle: "che-uop-hoa-moc-huong",
    description: "Chè ướp hương hoa mộc hương Thăng Long Chè Việt — hộp quà gồm 10 gói nhỏ 10g.",
    images: ["che_uop_hoa_moc_huong.jpg", "che_uop_hoa_moc_huong (2).jpg", "che_uop_hoa_moc_huong_ban_le.jpg"],
  },
  {
    title: "Chè Ướp Hoa Nhài",
    handle: "che-uop-hoa-nhai",
    description: "Chè ướp hương hoa nhài Thăng Long Chè Việt — hộp quà gồm 10 gói nhỏ 10g.",
    images: ["che_uop_nhai.jpg"],
  },
]

/**
 * Cleans up the create-medusa-app starter's demo products and seeds the real
 * tea catalog from the product photos in image-thanglong-tea/, published and
 * placed under the "Thăng Long Chè Việt" category (handle thang-long-che-viet
 * — the storefront's product-menu link routes to /san-pham/danh-muc/<handle>)
 * with placeholder VND prices — no real pricing was available at seed time,
 * so review price in the admin. Re-running this script also re-publishes and
 * re-links any of these products that already exist, so it's safe to rerun
 * after edits. "chè đinh" and "Áo nỉ TLCV Vintage" already exist with real
 * admin-entered data and are intentionally left untouched.
 */
export default async function seedTeaProducts({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModule = container.resolve(Modules.PRODUCT)
  const fileModule = container.resolve(Modules.FILE)
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)

  // --- 1. Remove leftover Medusa starter demo products -----------------------
  const demoProducts = await productModule.listProducts({ handle: DEMO_PRODUCT_HANDLES })
  if (demoProducts.length) {
    await deleteProductsWorkflow(container).run({
      input: { ids: demoProducts.map((p) => p.id) },
    })
    logger.info(`seed-tea-products: deleted ${demoProducts.length} Medusa demo product(s).`)
  } else {
    logger.info("seed-tea-products: no Medusa demo products found, skipping delete.")
  }

  // --- 2. Sales channel --------------------------------------------------------
  const [salesChannel] = await salesChannelModule.listSalesChannels({ name: "Default Sales Channel" })
  if (!salesChannel) {
    logger.error("seed-tea-products: no default sales channel found, aborting product creation.")
    return
  }

  // --- 2b. "Thăng Long Chè Việt" category, matched by the storefront's nav link
  let [category] = await productModule.listProductCategories({ handle: CATEGORY_HANDLE })
  if (!category) {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: { product_categories: [{ name: CATEGORY_NAME, handle: CATEGORY_HANDLE, is_active: true }] },
    })
    category = result[0]
    logger.info(`seed-tea-products: created category "${CATEGORY_NAME}" (${CATEGORY_HANDLE}).`)
  }

  // --- 3. Upload real product photos + create one product per tea variety ----
  // Local file provider returns an absolute URL; every other uploaded asset
  // in this repo is persisted as a host-independent "/static/..." path (see
  // src/api/utils/media-url.ts) so a MEDUSA_BACKEND_URL change never breaks
  // an already-saved link — match that convention here.
  const toRelativeStaticUrl = (url: string) => {
    const marker = "/static/"
    const idx = url.indexOf(marker)
    return idx === -1 ? url : url.slice(idx)
  }

  const uploadImage = async (filename: string) => {
    const content = fs.readFileSync(path.join(IMAGE_DIR, filename)).toString("base64")
    const [file] = await fileModule.createFiles([{ filename, mimeType: "image/jpeg", content }])
    return toRelativeStaticUrl(file.url)
  }

  for (const tea of TEAS) {
    const [existing] = await productModule.listProducts({ handle: tea.handle })
    if (existing) {
      await updateProductsWorkflow(container).run({
        input: {
          selector: { id: existing.id },
          update: { status: "published" as any, categories: [{ id: category.id }] },
        },
      })
      logger.info(`seed-tea-products: ${tea.handle} already exists, published + linked to category.`)
      continue
    }

    const urls = await Promise.all(tea.images.map(uploadImage))

    await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            title: tea.title,
            handle: tea.handle,
            description: tea.description,
            status: "published" as any,
            thumbnail: urls[0],
            images: urls.map((url) => ({ url })),
            categories: [{ id: category.id }],
            options: [{ title: "Loại", values: ["Nguyên hộp (10 gói)", "Bán lẻ (1 gói 10g)"] }],
            variants: [
              {
                title: "Nguyên hộp (10 gói)",
                options: { "Loại": "Nguyên hộp (10 gói)" },
                prices: [{ currency_code: "vnd", amount: 250000 }],
              },
              {
                title: "Bán lẻ (1 gói 10g)",
                options: { "Loại": "Bán lẻ (1 gói 10g)" },
                prices: [{ currency_code: "vnd", amount: 30000 }],
              },
            ],
            sales_channels: [{ id: salesChannel.id }],
          },
        ],
      },
    })
    logger.info(`seed-tea-products: created "${tea.title}" (published, ${urls.length} image(s), placeholder pricing).`)
  }

  logger.info("seed-tea-products: done.")
}
