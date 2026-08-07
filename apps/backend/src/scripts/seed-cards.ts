import type { ExecArgs } from "@medusajs/framework/types"
import { CARD_MODULE } from "../modules/card"
import type CardModuleService from "../modules/card/service"

/**
 * Seeds the homepage pillar/card list from what was previously hardcoded in
 * apps/web/components/home/HomePillarList.vue — same 10 link cards in the
 * same order, plus the 3 locked widget cards (promotions/contact/map) that
 * followed them, so the homepage looks unchanged right after this ships.
 */
// image paths are root-relative into apps/web/public/images/cards (served by
// the Nuxt app itself, same origin as the admin behind nginx) — NOT the
// Medusa file-local /static uploads dir, which deploy.sh deliberately excludes
// from the prod payload (uploads live on a server-side docker volume only).
// A root-relative path here ships with apps/web/.output on every deploy, so
// it resolves identically in dev and prod with no extra upload step.
const LINK_CARDS = [
  { title: { vi: "Nếp trà Việt", en: "Vietnamese Tea Culture" }, path: "/nep-tra-viet", image: "/images/cards/tlcv_nep_che_viet.jpg" },
  { title: { vi: "Văn hóa Việt & Làng nghề truyền thống", en: "Vietnamese Culture & Traditional Craft Villages" }, path: "/van-hoa-viet", image: "/images/cards/tlcv_van_hoa_truyen_thong_001.jpg" },
  { title: { vi: "Thăng Long Chè Việt (sản phẩm)", en: "Thang Long Che Viet (Products)" }, path: "/san-pham-list", image: "/images/cards/tlcv_san_pham.jpg" },
  { title: { vi: "Di sản trà cụ Việt", en: "Vietnamese Tea Heritage" }, path: "/di-san-tra-cu", image: "/images/cards/tlcv_can_tinh_viet_001.jpg" },
  { title: { vi: "Quà tặng doanh nghiệp", en: "Corporate Gifts" }, path: "/qua-tang-doanh-nghiep", image: "/images/cards/kp_thang_long_che_viet.jpg" },
  { title: { vi: "Vườn Ân Quang", en: "An Quang Garden" }, path: "/vuon-an-quang", image: "/images/cards/tlcv_van_hoa_truyen_thong_001.jpg" },
  { title: { vi: "Ân Quang Caffe", en: "An Quang Caffe" }, path: "/an-quang-caffe", image: "/images/cards/tlcv_nep_che_viet.jpg" },
  { title: { vi: "Trải nghiệm (Workshop & Sự kiện)", en: "Experiences (Workshops & Events)" }, path: "/trai-nghiem", image: "/images/cards/tlcv_can_tinh_viet_001.jpg" },
  { title: { vi: "Thư viện văn hóa Việt", en: "Vietnamese Cultural Library" }, path: "/thu-vien-van-hoa", image: "/images/cards/tlcv_san_pham.jpg" },
  { title: { vi: "Dự án & Đối tác", en: "Projects & Partners" }, path: "/du-an-doi-tac", image: "/images/cards/kp_thang_long_che_viet.jpg" },
]

const LOCKED_CARDS = [
  { type: "promotions" as const },
  { type: "contact" as const },
  { type: "map" as const },
]

export default async function seedCards({ container }: ExecArgs) {
  const cardModuleService: CardModuleService = container.resolve(CARD_MODULE)

  const existing = await cardModuleService.listCards({})
  if (existing.length) {
    console.log(`Cards already seeded (${existing.length} rows), skipping.`)
    return
  }

  let rank = 0

  for (const c of LINK_CARDS) {
    await cardModuleService.createCards({
      type: "link",
      title: c.title,
      image: c.image,
      path: c.path,
      rank: rank++,
      is_active: true,
      locked: false,
    })
  }

  for (const c of LOCKED_CARDS) {
    await cardModuleService.createCards({
      type: c.type,
      title: null,
      image: null,
      path: null,
      rank: rank++,
      is_active: true,
      locked: true,
    })
  }

  console.log(`Seeded ${LINK_CARDS.length} link cards + ${LOCKED_CARDS.length} locked widget cards.`)
}
