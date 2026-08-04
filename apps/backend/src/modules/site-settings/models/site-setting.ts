import { model } from "@medusajs/framework/utils"

const SiteSetting = model.define("site_setting", {
  id: model.id({ prefix: "sset" }).primaryKey(),
  store_name: model.text().nullable(),
  email: model.text().nullable(),
  phone: model.text().nullable(),
  address: model.text().nullable(),
  // Google Maps share/embed link for the address
  google_map_url: model.text().nullable(),
  open_hours: model.text().nullable(),
  facebook_url: model.text().nullable(),
  zalo_url: model.text().nullable(),
  instagram_url: model.text().nullable(),
  // Homepage hero image URLs (JSON array; DB NOT NULL with default [])
  hero_images: model.json().default([]),
  // "Giới thiệu" article shown on the storefront about page
  about_title: model.text().nullable(),
  about_thumbnail: model.text().nullable(),
  about_content: model.json().nullable(),
  // Collection whose products accompany the about page sidebar
  about_collection_id: model.text().nullable(),
})

export default SiteSetting
