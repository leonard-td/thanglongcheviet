import { model } from "@medusajs/framework/utils"

export const SiteSetting = model.define("site_setting", {
  id: model.id().primaryKey(),
  key: model.text().unique(),
  value: model.json().nullable(),
})
