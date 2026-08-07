import { model } from "@medusajs/framework/utils"

/**
 * A homepage "pillar" tile. type="link" is a plain image+title+link card,
 * fully editable/deletable. The other types back a fixed widget rendered by
 * the storefront itself (contact info, map, monthly promotions) — locked=true
 * for those, so only rank/is_active can change, never their content or type.
 */
const Card = model.define("card", {
  id: model.id({ prefix: "card" }).primaryKey(),
  type: model.enum(["link", "contact", "map", "promotions"]).default("link"),
  title: model.json().nullable(),
  image: model.text().nullable(),
  path: model.text().nullable(),
  // Article topic this card links to (type="link" only) — set when an admin
  // picks a topic from the picker instead of typing `path` by hand; kept so
  // the picker can show the current selection on re-edit. Purely a
  // convenience label, the storefront always navigates via `path`.
  topic_id: model.text().nullable(),
  rank: model.number().default(0),
  is_active: model.boolean().default(true),
  locked: model.boolean().default(false),
})

export default Card
