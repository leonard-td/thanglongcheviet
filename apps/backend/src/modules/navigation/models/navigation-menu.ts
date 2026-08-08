import { model } from "@medusajs/framework/utils"

/**
 * A named menu template (e.g. default header, Tet campaign header).
 * Exactly one menu should be `is_active` for the storefront at a time.
 */
export const NavigationMenu = model.define("navigation_menu", {
  id: model.id({ prefix: "navm" }).primaryKey(),
  name: model.text().searchable(),
  slug: model.text(),
  is_active: model.boolean().default(false),
})

export default NavigationMenu
