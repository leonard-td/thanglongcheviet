import type { ExecArgs } from "@medusajs/framework/types"
import {
  createProductCategoriesWorkflow,
  updateProductCategoriesWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * The storefront's product mega-menu (apps/web/components/layout/
 * AppHeaderProductsMenu.vue) shows three groups — Chè / Cà phê / Quà tặng —
 * but only "Chè" was ever backed by a real Medusa product category
 * (thang-long-che-viet, from seed-tea-products.ts). The storefront used to
 * tell the coffee/gift categories apart from "Chè" by matching a hardcoded
 * handle guess, which broke the moment an admin created/renamed the "cà phê"
 * category by hand in the dashboard (handle ended up "ca-phe", not the
 * guessed "an-quang-caffe") — the category silently fell back into the
 * "Chè" group instead of its own.
 *
 * This script is the fix at the data layer: it tags each category with
 * metadata.menu_group ("coffee" | "gift"), which the storefront now reads
 * directly (apps/web/composables/useProducts.ts / AppHeaderProductsMenu.vue)
 * instead of guessing from the handle. Handle matching is kept only as a
 * one-time fallback so this script finds categories admins already created
 * manually. If an admin renames a category's handle later, no code change is
 * needed — just re-run this script, or set metadata.menu_group directly via
 * the category's built-in "Metadata" editor in Medusa admin.
 *
 * Also links the two existing gift products (created with no category_ids
 * at all) to the gift category. Safe to re-run.
 *
 * Run: npm run sync:menu-categories -w @dtc/backend
 */

const COFFEE_CATEGORY = { name: "Cà phê", handles: ["ca-phe", "an-quang-caffe"], menuGroup: "coffee" }
const GIFT_CATEGORY = { name: "Quà tặng doanh nghiệp", handles: ["qua-tang-doanh-nghiep"], menuGroup: "gift" }
const GIFT_PRODUCT_HANDLES = ["hop-qua-doanh-nghiep-vip", "set-qua-tang-tinh-hoa"]

export default async function syncMenuCategories({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModule = container.resolve(Modules.PRODUCT)

  const ensureCategory = async (def: { name: string; handles: string[]; menuGroup: string }) => {
    const [existing] = await productModule.listProductCategories({ handle: def.handles })

    if (!existing) {
      const { result } = await createProductCategoriesWorkflow(container).run({
        input: {
          product_categories: [
            { name: def.name, handle: def.handles[0], is_active: true, metadata: { menu_group: def.menuGroup } },
          ],
        },
      })
      logger.info(`sync-menu-categories: created category "${def.name}" (${def.handles[0]}), tagged menu_group=${def.menuGroup}.`)
      return result[0]
    }

    if (existing.metadata?.menu_group === def.menuGroup) {
      logger.info(`sync-menu-categories: category "${existing.name}" (${existing.handle}) already tagged menu_group=${def.menuGroup}.`)
      return existing
    }

    const { result } = await updateProductCategoriesWorkflow(container).run({
      input: {
        selector: { id: existing.id },
        update: { metadata: { ...existing.metadata, menu_group: def.menuGroup } },
      },
    })
    logger.info(`sync-menu-categories: tagged existing category "${existing.name}" (${existing.handle}) with menu_group=${def.menuGroup}.`)
    return result[0]
  }

  const coffeeCategory = await ensureCategory(COFFEE_CATEGORY)
  const giftCategory = await ensureCategory(GIFT_CATEGORY)

  const giftProducts = await productModule.listProducts(
    { handle: GIFT_PRODUCT_HANDLES },
    { relations: ["categories"] },
  )
  if (giftProducts.length === 0) {
    logger.warn(
      `sync-menu-categories: none of [${GIFT_PRODUCT_HANDLES.join(", ")}] found — nothing to link to "${GIFT_CATEGORY.name}".`,
    )
  } else {
    const unlinked = giftProducts.filter(
      (p) => !(p.categories ?? []).some((c: { id: string }) => c.id === giftCategory.id),
    )
    if (unlinked.length === 0) {
      logger.info(`sync-menu-categories: all gift products already linked to "${GIFT_CATEGORY.name}".`)
    } else {
      await updateProductsWorkflow(container).run({
        input: {
          products: unlinked.map((p) => ({
            id: p.id,
            category_ids: [...(p.categories ?? []).map((c: { id: string }) => c.id), giftCategory.id],
          })),
        },
      })
      logger.info(`sync-menu-categories: linked ${unlinked.length} gift product(s) to "${GIFT_CATEGORY.name}".`)
    }
  }

  logger.info(
    `sync-menu-categories: done. coffee=${coffeeCategory.id} gift=${giftCategory.id} (coffee has no products yet — add them in admin under "${COFFEE_CATEGORY.name}").`,
  )
}
