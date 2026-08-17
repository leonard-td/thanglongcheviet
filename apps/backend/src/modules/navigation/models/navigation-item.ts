import { model } from "@medusajs/framework/utils"

export const NavigationItem = model.define("navigation_item", {
  id: model.id({ prefix: "navi" }).primaryKey(),
  menu_id: model.text(),
  label: model.text(),
  url: model.text(),
  order: model.number().default(0),
  openInNewTab: model.boolean().default(false),
  parent_id: model.text().nullable(),
  is_active: model.boolean().default(true),
  // Manual thumbnail override. When empty, the admin UI and storefront both
  // fall back to the thumbnail resolved from `url` (see
  // src/api/utils/nav-thumbnails.ts) — e.g. a product/category/post/event
  // matched by the URL's path convention.
  thumbnail: model.text().nullable(),
  // Icon key from the shared nav icon set (see admin's icon-options.ts and
  // the storefront's Icon.vue AppIconName union) — only meaningful when
  // display_mode is "icon".
  icon: model.text().nullable(),
  // What renders before the label on the storefront's main navigation bar
  // (top-level items only): nothing, the `icon` above, or `thumbnail`.
  display_mode: model.enum(["none", "icon", "image"]).default("none"),
})

export default NavigationItem
