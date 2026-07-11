import { model } from "@medusajs/framework/utils"

export const NavigationItem = model.define("navigation_item", {
  id: model.id({ prefix: "navi" }).primaryKey(),
  label: model.text(),
  url: model.text(),
  order: model.number().default(0),
  openInNewTab: model.boolean().default(false),
  parent_id: model.text().nullable(),
  is_active: model.boolean().default(true),
})

export default NavigationItem
