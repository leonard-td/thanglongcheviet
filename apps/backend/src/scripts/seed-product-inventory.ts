import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createInventoryLevelsWorkflow,
  updateInventoryLevelsWorkflow,
} from "@medusajs/medusa/core-flows"

const DEFAULT_STOCK = 1000

/**
 * Gift/seed products are created with manage_inventory=true but no stock levels
 * at the default location — Store API reports inventory_quantity=0 and the
 * storefront disables add-to-cart. Idempotent: creates missing levels or tops up zero stock.
 */
export default async function seedProductInventory({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: locations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  })
  const location = locations[0]
  if (!location) {
    logger.warn("seed-product-inventory: no stock location found, skipping.")
    return
  }

  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  })
  if (!inventoryItems.length) {
    logger.info("seed-product-inventory: no inventory items found.")
    return
  }

  const { data: existingLevels } = await query.graph({
    entity: "inventory_level",
    fields: ["id", "inventory_item_id", "stocked_quantity", "location_id"],
    filters: { location_id: location.id },
  })

  const levelByItem = new Map(
    existingLevels.map((l: { inventory_item_id: string; id: string; stocked_quantity: number }) => [
      l.inventory_item_id,
      l,
    ]),
  )

  const toCreate: { location_id: string; inventory_item_id: string; stocked_quantity: number }[] = []
  const toUpdate: { id: string; stocked_quantity: number }[] = []

  for (const item of inventoryItems) {
    const level = levelByItem.get(item.id) as
      | { id: string; stocked_quantity: number }
      | undefined
    if (!level) {
      toCreate.push({
        location_id: location.id,
        inventory_item_id: item.id,
        stocked_quantity: DEFAULT_STOCK,
      })
    } else if ((level.stocked_quantity ?? 0) <= 0) {
      toUpdate.push({ id: level.id, stocked_quantity: DEFAULT_STOCK })
    }
  }

  if (toCreate.length) {
    await createInventoryLevelsWorkflow(container).run({ input: { inventory_levels: toCreate } })
    logger.info(`seed-product-inventory: created ${toCreate.length} inventory level(s).`)
  }

  if (toUpdate.length) {
    await updateInventoryLevelsWorkflow(container).run({
      input: { updates: toUpdate },
    })
    logger.info(`seed-product-inventory: updated ${toUpdate.length} inventory level(s).`)
  }

  if (!toCreate.length && !toUpdate.length) {
    logger.info("seed-product-inventory: all items already have stock.")
  }
}
