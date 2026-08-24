import { model } from "@medusajs/framework/utils"

const SiteSetting = model.define("site_setting", {
  id: model.id({ prefix: "sset" }).primaryKey(),
  store_name: model.text().nullable(),
  email: model.text().nullable(),
  phone: model.text().nullable(),
  // Secondary "hotline" number shown next to `phone` on the storefront
  hotline: model.text().nullable(),
  address: model.text().nullable(),
  // Public website address rendered as the footer's website row
  website_url: model.text().nullable(),
  // Bilingual brand copy: { vi: { tagline, description }, en: {...} }.
  // Drives the storefront's <title>/og:description — resolved per request
  // locale by resolveSiteSettingTranslation().
  translations: model.json().nullable(),
  // Google Maps share/embed link for the address
  google_map_url: model.text().nullable(),
  open_hours: model.text().nullable(),
  facebook_url: model.text().nullable(),
  zalo_url: model.text().nullable(),
  instagram_url: model.text().nullable(),
  // The two homepage background/hero images, ordered (JSON array of URLs;
  // DB default '[]', read as [] when null)
  hero_images: model.json().nullable(),
  // "Giới thiệu" article shown on the storefront about page
  about_title: model.text().nullable(),
  about_thumbnail: model.text().nullable(),
  about_content: model.json().nullable(),
  // Collection whose products accompany the about page sidebar
  about_collection_id: model.text().nullable(),
  // YouTube URL/ID for the "video giới thiệu" facade on the homepage pillar list
  home_video_url: model.text().nullable(),
})

export default SiteSetting
