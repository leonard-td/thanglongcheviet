import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/** Verified Unsplash URLs (HEAD 200) — rotate when replacing broken product images. */
const WORKING_IMAGES = [
  "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1563822249548-9a72b6353cd1?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1582793988951-9aed5509eb97?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1563911302283-d2bc129e7570?auto=format&fit=crop&w=1200&q=80",
]

async function urlReachable(url: string): Promise<boolean> {
  if (!url?.startsWith("http")) return true
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(8000) })
    return res.ok
  } catch {
    return false
  }
}

function replacementForIndex(i: number): string {
  return WORKING_IMAGES[i % WORKING_IMAGES.length]!
}

/**
 * Replace broken Unsplash (or unreachable) product thumbnails/images.
 * Run: npx medusa exec ./src/scripts/fix-product-images.ts
 */
export default async function fixProductImages({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModule = container.resolve(Modules.PRODUCT)

  const products = await productModule.listProducts(
    {},
    { take: 500, relations: ["images"] },
  )

  const updates: Array<{
    id: string
    thumbnail?: string
    images?: { url: string }[]
  }> = []

  let idx = 0
  for (const product of products) {
    const patch: (typeof updates)[number] = { id: product.id }
    let changed = false

    const thumb = product.thumbnail as string | null | undefined
    if (thumb && !(await urlReachable(thumb))) {
      patch.thumbnail = replacementForIndex(idx++)
      changed = true
    }

    const images = (product as { images?: { url: string }[] }).images ?? []
    const fixedImages: { url: string }[] = []
    let imagesChanged = false
    for (const img of images) {
      if (img.url && !(await urlReachable(img.url))) {
        fixedImages.push({ url: replacementForIndex(idx++) })
        imagesChanged = true
      } else {
        fixedImages.push({ url: img.url })
      }
    }

    if (imagesChanged) {
      patch.images = fixedImages
      changed = true
    }

    if (changed) updates.push(patch)
  }

  if (!updates.length) {
    logger.info("fix-product-images: all product images reachable, nothing to do.")
    return
  }

  await updateProductsWorkflow(container).run({
    input: { products: updates },
  })

  logger.info(`fix-product-images: updated ${updates.length}/${products.length} products.`)
}
