# Audit hiệu năng & Code sạch — Trang Client (`apps/web`)

**Ngày audit:** 2026-08-06
**Phạm vi:** Toàn bộ 27 route trong `pages/` (storefront khách hàng), theo chuỗi import vào `components/` + `composables/` liên quan.
**Phương pháp:** Đối chiếu code thực tế với các rule đã được build sẵn trong repo — không bịa rule mới. Nguồn: `.cursor/rules/03-nuxt-frontend.mdc`, `.cursor/rules/01-responsive-mobile-first.mdc`, `.ai/COMPONENT_GUIDE.md`, `.ai/DECISIONS.md`, `.ai/KNOWN_ISSUES.md`.

> File này là **task board** — mỗi trang có checklist riêng, tick `[x]` khi fix xong. Ưu tiên xử lý mục "🔴 Phát hiện xuyên suốt" trước vì chúng chạm nhiều trang cùng lúc (fix 1 chỗ ở composable = hết bug ở N trang).

## ✅ Đã xử lý (2026-08-07) — ưu tiên + lazy loading

Đợt fix này tập trung vào **bug 404 giả**, **lỗi bị nuốt im lặng**, **`robots: noindex`**, và **toàn bộ phần thiếu lazy loading ảnh** (mục 2.1, 2.2, 2.4, 2.5 + các task ảnh tương ứng ở mục 3). Cụ thể:

- **Bug 404 giả (2.1)** — sửa `useTopics.ts` (cả `useTopicsByType`), `useBlog.ts` (`getTopicBySlug`), `useEvents.ts` (`getBySlug`), `useProducts.ts` (`categoriesData`/`collectionsData` giờ expose `categoriesError`/`collectionsError`). Cập nhật `watchEffect` ở 6 trang liên quan (`san-pham/danh-muc`, `san-pham/bo-suu-tap`, `san-pham/chu-de`, `tin-tuc/chu-de`, `trai-nghiem/[slug]`, `trai-nghiem/chu-de`) để phân biệt 404 thật với lỗi transport qua `resolveStoreLoadError`. Thêm i18n keys `blog.notFound/loadError/configError`, `events.notFound/loadError/configError`.
- **Ảnh thiếu `<NuxtImg>`/lazy loading (2.2)** — đổi toàn bộ `<img>` raw sang `<NuxtImg>` với `sizes`/`format="webp"`/`loading="lazy"` phù hợp (ảnh above-the-fold như banner/hero giữ eager, ảnh dưới-fold/thumbnail thêm `lazy`) ở: `ProductCatalog.vue`, `san-pham/[slug].vue` (5 vị trí, ảnh chính dùng `preload` thay vì lazy vì là LCP), `ProductGroupShowcase.vue`, `san-pham/chu-de/[slug].vue`, `BlogTopics.vue`, `BlogList.vue`, `CollectionShowcase.vue`, `tin-tuc/[slug].vue`, `tin-tuc/chu-de/[slug].vue`, `trai-nghiem/index.vue`, `trai-nghiem/[slug].vue`, `trai-nghiem/chu-de/[slug].vue`, `HomeV3PillarList.vue`, `HomeNewsTicker.vue`, `HomePromotionsList.vue`, `gio-hang.vue`, `AutoScrollSidebar.vue`, `gioi-thieu.vue`. (Bỏ qua `SiteLogo.vue` — cố tình eager vì là LCP; `HomePillarList.vue` — component cũ không còn dùng.)
- **Lỗi bị nuốt im lặng (2.4)** — `useCart.ts`: `updateCart`/`removeFromCart` giờ trả `{success, message}`, `gio-hang.vue` hiện lỗi ngay trên danh sách giỏ hàng. `useCustomerAuth.ts`: `fetchAppointments`/`fetchOrders` giờ rethrow thay vì nuốt lỗi; `tai-khoan.vue` tách trạng thái "lỗi tải — thử lại" khỏi trạng thái "chưa có dữ liệu" thật.
- **`robots: noindex` (2.5)** — thêm vào `gio-hang.vue`, `thanh-toan/ket-qua.vue`, `tai-khoan.vue`, `tra-cuu-don.vue`.
- **Dọn dead code đi kèm** — xoá các block comment-out ở `san-pham-list.vue`, `san-pham/[slug].vue` (x2), `ProductGroupShowcase.vue` (x2, gồm block "group switcher" 18 dòng), `tin-tuc/chu-de/[slug].vue`; xoá logic 404-check trùng lặp ở `tin-tuc/[slug].vue`; bỏ `h-[200px] md:h-[250px]` xung đột với `aspect-[4/5]` trong `ProductGroupShowcase.vue`.
- Xác nhận bằng `npm run typecheck` — pass sạch, không lỗi.

**Chưa làm trong đợt này** (để lại cho vòng sau, không phải "ưu tiên/lazy loading"): xoá `useApi.ts` mồ côi, gộp component lưới sản phẩm trùng lặp (2.7), tách `san-pham/[slug].vue` thành subcomponent, đồng bộ cấu trúc `tin-tuc/*` ↔ `trai-nghiem/*` (2.6), xoá biến `locale` không dùng trong `ServicesTabs.vue`/`TeamFull.vue`, cập nhật lại note lỗi thời về `useScrollAnimation` trong `.ai/DECISIONS.md` (2.8), xác thực `thanh-toan/ket-qua.vue` qua `lookupOrder` thay vì chỉ tin `?status=`.

---

## 1. Bộ tiêu chuẩn dùng để chấm điểm

Đây là các rule **đã tồn tại trong repo**, audit này chỉ kiểm tra code có tuân theo hay không, không đề xuất rule mới ngoài phạm vi đã build.

### Performance
| # | Rule | Nguồn |
|---|---|---|
| P1 | Mọi page phải có `useSeoMeta`/`useHead` với tối thiểu `title` + `description` | `03-nuxt-frontend.mdc` §SEO |
| P2 | Ảnh nội dung luôn dùng `<NuxtImg>` (không dùng `<img>` raw), có `sizes`, `format="webp"`, `loading="lazy"` | `03-nuxt-frontend.mdc` §Performance, `01-responsive-mobile-first.mdc` §Images |
| P3 | Fetch dữ liệu ban đầu qua `useAsyncData`/`useFetch` (SSR-safe), không dùng `onMounted(() => fetch(...))` cho initial data | `03-nuxt-frontend.mdc` §API Calls |
| P4 | Component nặng (slider, video/parallax, map, gallery) nên lazy-load (`defineAsyncComponent`) | `03-nuxt-frontend.mdc` §Performance |
| P5 | Trang chi tiết (`[slug].vue`) phải phân biệt lỗi 404 thật với lỗi transport/network — chỉ 404 thật mới `createError({statusCode:404})` | `.ai/KNOWN_ISSUES.md` "Fixed 2026-07: Detail reload false-404", `.ai/DECISIONS.md` #011 |
| P6 | `useScrollAnimation()` chỉ observe phần tử có mặt lúc mount → không swap mảng nguồn `v-for` cho danh sách có animation, phải lọc bằng `v-show` | `.ai/DECISIONS.md`, code `ProductCatalog.vue` |

### Code sạch
| # | Rule | Nguồn |
|---|---|---|
| C1 | Thứ tự `<script setup>`: imports → props/emits → composables → state → computed → methods → lifecycle | `03-nuxt-frontend.mdc` §Component Structure |
| C2 | Đặt tên/thư mục component đúng theo `layout/`, `home/`, `sections/`, `widgets/`, `product/` | `.ai/COMPONENT_GUIDE.md` |
| C3 | Không hardcode px cho width/font-size — dùng Tailwind responsive classes | `01-responsive-mobile-first.mdc` |
| C4 | Không còn dead code: block comment-out, biến/import không dùng, `console.log/warn/error` sót lại, TODO/FIXME chưa xử lý | Chuẩn chung |
| C5 | `PRODUCT_FIELDS` trong `useProducts.ts` là nơi duy nhất định nghĩa field-selection Store API — không query field list riêng ở nơi khác | `.ai/DECISIONS.md` §Products domain |
| C6 | Field admin-editable qua `useSiteBundle`/`useSettings` phải có trong merge block, nếu không sẽ không bao giờ live | `.ai/DECISIONS.md` §data-fetching contracts |

---

## 2. 🔴 Phát hiện xuyên suốt (fix ở 1 chỗ, hết bug ở nhiều trang)

Đây là các phát hiện có giá trị cao nhất — nên làm trước tiên.

### 2.1 — Bug thật: false-404 khi API lỗi tạm thời, chưa fix hết cho mọi vertical
`.ai/KNOWN_ISSUES.md` ghi nhận bug này **đã fix cho blog/product `getBySlug` (2026-07)**: chỉ 404 thật mới throw, lỗi transport phải rethrow. Nhưng fix đó **không được áp dụng cho các composable khác cùng pattern**:

- [ ] `composables/useTopics.ts` → `getTopicBySlug()` (dùng bởi `san-pham/chu-de/[slug].vue`, `trai-nghiem/chu-de/[slug].vue`) — nuốt mọi lỗi bằng `try/catch { console.error(e); return null }`, không phân biệt 404 thật. Có `console.warn`/`console.error` sót lại (dòng ~46, ~67) — dọn luôn.
- [ ] `composables/useBlog.ts` → `getTopicBySlug()` (dùng bởi `tin-tuc/chu-de/[slug].vue`) — cùng lỗi, không dùng `isNotFoundError` như `getBySlug` (post) đã dùng đúng.
- [ ] `composables/useEvents.ts` → `getBySlug()` (dùng bởi `trai-nghiem/[slug].vue`) — nuốt mọi lỗi bằng `console.error`, **không có local JSON fallback** như blog nên hậu quả nặng hơn: outage tạm thời trên backend sẽ khiến trang sự kiện thật bị 404.
- [ ] `composables/useProducts.ts` → `categoriesData`/`collectionsData` (dùng bởi `san-pham/danh-muc/[slug].vue`, `san-pham/bo-suu-tap/[slug].vue`) — fetch lỗi thì fallback im lặng về mảng rỗng, không có error channel lộ ra ngoài, khiến 2 trang này không phân biệt được "slug không tồn tại" với "backend down".

**Cách fix chuẩn (đã có sẵn trong `useProducts.ts` → `getBySlug()` làm mẫu):** bọc fetch trong try/catch, dùng `isNotFoundError(e)` (từ `utils/fetch-status.ts`) để chỉ trả `null`/404 khi đúng là 404, còn lại rethrow; ở page, đọc `error` từ `useAsyncData` và chỉ map lỗi thật-404 sang `createError(404)`, lỗi khác map sang 5xx qua `resolveStoreLoadError`.

**Gợi ý thêm:** `useBlogTopics.getTopicBySlug` và `useTopicsByType.getTopicBySlug` gần như là bản sao của nhau (chỉ khác `content_type`) — cân nhắc gộp thành 1 composable dùng chung để sửa bug 1 lần thay vì 2 lần.

### 2.2 — Ảnh: `<NuxtImg>` gần như không được dùng dù là rule bắt buộc
`@nuxt/image` đã cài và **được dùng đúng** ở một số nơi (`TeamFull.vue`, `pages/gallery.vue`, `BlogSnippet.vue`, `HeroSlider.vue`, `qua-tang-doanh-nghiep.vue`) — nhưng phần lớn hệ thống sản phẩm/blog/sự kiện (khối lượng ảnh lớn nhất site) vẫn dùng `<img>` raw:

- [ ] `components/product/*` / trang `san-pham/[slug].vue` (5 vị trí: gallery, thumbnail, zoom lens, related grid, quick-buy bar)
- [ ] `ProductCatalog.vue` (lưới sản phẩm chính, trang traffic cao nhất site)
- [ ] `ProductGroupShowcase.vue` (dùng chung bởi `danh-muc/[slug].vue` + `bo-suu-tap/[slug].vue`)
- [ ] `san-pham/chu-de/[slug].vue` (banner + grid)
- [ ] `BlogTopics.vue`, `BlogList.vue` (trang `tin-tuc/index.vue`)
- [ ] `tin-tuc/[slug].vue` (banner cover + related-posts grid)
- [ ] `tin-tuc/chu-de/[slug].vue` (banner + grid)
- [ ] `trai-nghiem/index.vue`, `trai-nghiem/[slug].vue`, `trai-nghiem/chu-de/[slug].vue` (banner + grid)
- [ ] `HomeV3PillarList.vue` (trang chủ — mức độ ưu tiên thấp hơn vì đã above-fold nhỏ)
- [ ] `pages/gio-hang.vue` (thumbnail sản phẩm trong giỏ hàng)

→ Đây là **thắng lợi lớn nhất về performance** trong toàn bộ audit: đổi 1 pattern (`<img>` → `<NuxtImg loading="lazy" sizes="..." format="webp">`) áp dụng lặp lại ở ~15 vị trí, ưu tiên `ProductCatalog.vue` và `san-pham/[slug].vue` trước vì traffic cao nhất.

### 2.3 — Dead code / composable mồ côi
- [ ] `composables/useApi.ts` (legacy `/api/storefront` client) — grep toàn repo: **không còn nơi nào gọi** `useApi()`/`fetchApi()`. Xác nhận lại qua git history rồi xoá hẳn thay vì để 2 client song song (đã ghi trong `.ai/KNOWN_ISSUES.md` "Dual clients" — giờ có thể đóng luôn, không phải "cần migrate" mà là "chết hẳn, xoá được").
- [ ] Các block comment-out còn sót trong template (liệt kê chi tiết ở mục 3 theo từng trang): `san-pham-list.vue`, `san-pham/[slug].vue` (x2), `ProductGroupShowcase.vue` (x2, có 1 block 18 dòng), `tin-tuc/chu-de/[slug].vue`.
- [ ] Biến `locale` destructure nhưng không dùng: `components/sections/ServicesTabs.vue:4`, `components/sections/TeamFull.vue:3`.

### 2.4 — Lỗi bị nuốt im lặng ở luồng có tiền/tài khoản (không có fallback content để che)
Cart/account/order là "real Medusa entities — no local fallback" (`.ai/DECISIONS.md`) → khi API lỗi, UI **phải** báo lỗi rõ ràng, không được hiện trạng thái rỗng như thể đó là sự thật:
- [ ] `useCart.ts` → `updateCart`/`removeFromCart` chỉ `console.error`, không trả lỗi ra UI → người dùng sửa/xoá sản phẩm trong giỏ thất bại mà không biết.
- [ ] `useCustomerAuth.ts` → `fetchAppointments()`/`fetchOrders()` nuốt lỗi, trả `[]` → trang "Tài khoản" hiện "chưa có đơn hàng" y hệt trường hợp API lỗi thật.
- [ ] `thanh-toan/ket-qua.vue` — trạng thái thành công/thất bại chỉ dựa vào query param `?status=` (client tự sửa URL được), không re-verify với backend qua `lookupOrder`.

### 2.5 — Thiếu `robots: noindex` cho trang giao dịch
Grep toàn app: không có `robots`/`noindex` ở đâu cả, không có `routeRules` trong `nuxt.config.ts`. 4 trang sau lẽ ra không nên bị index:
- [ ] `gio-hang.vue`, `thanh-toan/ket-qua.vue`, `tai-khoan.vue`, `tra-cuu-don.vue`

### 2.6 — Trùng lặp cấu trúc giữa 2 vertical `tin-tuc/*` và `trai-nghiem/*`
Hai bộ trang gần như song sinh nhưng copy-paste rời nhau, dẫn tới lệch pha khi 1 bên được fix còn bên kia thì không (chính là nguồn gốc bug 2.1):
- [ ] `trai-nghiem/index.vue` không tái dùng `LayoutPageHero` như `tin-tuc/index.vue`, tự dựng lại header tương đương với spacing khác.
- [ ] Block CSS `.article-body :deep(...)` (TipTap prose, ~75-85 dòng) bị copy y hệt giữa `tin-tuc/[slug].vue` và `trai-nghiem/[slug].vue` — nên tách thành 1 style dùng chung.
- [ ] `trai-nghiem/[slug].vue` thiếu structured data (JSON-LD) trong khi `tin-tuc/[slug].vue` có `useArticleStructuredData` — nên có `Event` schema tương đương.
- [ ] Magic number `-mt-[72px]` lặp lại độc lập ở 3+ template dù `useHeaderBanner.ts` đã export hằng số `HEADER_HEIGHT = 72` — nên tham chiếu hằng số thay vì hardcode lại.

### 2.7 — Lưới sản phẩm bị viết lại 3 lần
`ProductCatalog.vue`, `ProductGroupShowcase.vue`, và `san-pham/chu-de/[slug].vue` đều tự implement lưới sản phẩm + skeleton loading + empty state gần như giống hệt nhau thay vì dùng chung 1 component `ProductGrid`.
- [ ] Gộp thành 1 component dùng chung (giảm ~150-200 dòng trùng lặp, fix bug/style 1 lần thay vì 3 lần).

### 2.8 — Ghi chú lỗi thời trong `.ai/DECISIONS.md`
`ProductCatalog.vue` dùng `v-show` thay vì swap `v-for` vì lý do "`useScrollAnimation()` chỉ observe phần tử lúc mount" — nhưng đọc code thực tế (`composables/useScrollAnimation.ts:26-35`), giờ đã có `MutationObserver` tự động observe node mới thêm vào DOM. Pattern `v-show` hiện tại vẫn đúng/vô hại, nhưng lý do trong doc đã lỗi thời.
- [ ] Cập nhật `.ai/DECISIONS.md` #013-adjacent note để không đánh lừa người đọc sau này (không phải fix code).

---

## 3. Task theo từng trang

Ký hiệu: ✅ Pass · ⚠️ Warning · ❌ Fail · N/A không áp dụng.

### Nhóm A — Trang tĩnh/nội dung (marketing)

#### `pages/an-quang-caffe.vue`, `di-san-tra-cu.vue`, `du-an-doi-tac.vue`, `nep-tra-viet.vue`, `thu-vien-van-hoa.vue`, `van-hoa-viet.vue`, `vuon-an-quang.vue`
Cả 7 trang này giống hệt nhau (13 dòng, chỉ khác key i18n), dùng chung `LayoutComingSoonSection`.
- P1 ❌ — `useSeoMeta` chỉ có `title`, thiếu `description` bắt buộc.
- P2–P6, C1, C4 ✅ Pass (trang tĩnh, không có logic phức tạp).
- C2 ⚠️ — `ComingSoonSection.vue` đặt ở `layout/` nhưng về bản chất là content-filler section, nên ở `sections/` theo `COMPONENT_GUIDE.md`.

**Task:**
- [ ] Thêm `description` vào `useSeoMeta` ở cả 7 file (copy 1 pattern áp dụng 7 lần).
- [ ] (Tuỳ chọn, ưu tiên thấp) Di chuyển `components/layout/ComingSoonSection.vue` → `components/sections/`.

#### `pages/dich-vu.vue` → `SectionsServicesTabs.vue`
- P1 ✅, P2 N/A (không có ảnh), P3 ✅ (`useServices` → `useAsyncData`), P6 ✅.
- C4 ⚠️ — biến `locale` destructure nhưng không dùng (`ServicesTabs.vue:4`).

**Task:**
- [ ] Xoá `locale` không dùng trong `ServicesTabs.vue:4`.

#### `pages/doi-ngu.vue` → `SectionsTeamFull.vue`
- P1 ✅, P2 ✅ (`NuxtImg` đúng chuẩn — làm mẫu tốt cho các trang khác), P3 ✅, P6 ✅.
- C4 ⚠️ — biến `locale` không dùng (`TeamFull.vue:3`).

**Task:**
- [ ] Xoá `locale` không dùng trong `TeamFull.vue:3`.

#### `pages/lien-he.vue` → `SectionsContactSection.vue`
Trang sạch nhất trong nhóm — không có finding nào cần fix. ✅ Pass toàn bộ checklist, kể cả error handling (`submitContact`/`submitBooking` có try/catch + `parseApiError` đúng chuẩn).

**Task:** Không có việc cần làm.

---

### Nhóm B — Trang chủ & Sản phẩm

#### `pages/index.vue`
- P2 ⚠️ — `HomeV3PillarList.vue` dùng `<img>` raw cho thumbnail bài viết/card (dòng ~99, 116, 147).
- P4 ⚠️ — `HomeV3PillarList` (26.8K) luôn mount eager, không lazy dù không phải toàn bộ đều above-the-fold.
- P1 N/A, P3 ✅, C1/C3/C4 ✅.

**Task:**
- [ ] Đổi `<img>` → `<NuxtImg>` trong `HomeV3PillarList.vue` (3 vị trí).
- [ ] Cân nhắc `defineAsyncComponent` cho phần dưới-fold của `HomeV3PillarList`.

#### `pages/san-pham-list.vue` + `ProductCatalog.vue`
- P2 ❌ — `<img>` raw cho **toàn bộ lưới sản phẩm** (`ProductCatalog.vue:86-91`) — ưu tiên cao nhất trong mục 2.2 vì đây là trang traffic cao nhất.
- P3 ✅, P5 N/A, P6 ✅ (pattern `v-show` đúng chuẩn, đã verify).
- C4 ⚠️ — block `<LayoutPageHero>` comment-out còn sót (`san-pham-list.vue:15-19`).

**Task:**
- [ ] Đổi `<img>` → `<NuxtImg>` trong `ProductCatalog.vue:86-91`.
- [ ] Xoá hoặc khôi phục block `LayoutPageHero` comment-out.

#### `pages/san-pham/[slug].vue` (642 dòng — trang lớn nhất app)
- P1 ✅ (SEO động + JSON-LD `useProductStructuredData` — làm tốt hơn cả checklist).
- P2 ❌ — 5 vị trí dùng `<img>` raw (gallery, thumbnail, zoom lens, related grid, quick-buy bar); lens zoom còn load full-res làm CSS background không giới hạn kích thước.
- P3 ✅, P5 ✅ (làm mẫu chuẩn cho toàn app: `isNotFoundError` + rethrow + `resolveStoreLoadError`).
- C1 ⚠️ — vài method khai báo trước state chúng dùng; state của gallery/zoom/buy-bar/quick-buy xen kẽ nhau thay vì gom nhóm.
- C4 ⚠️ — 2 block `<p>` comment-out (dòng 331, 475-477).

**Task (ưu tiên theo thứ tự):**
- [ ] Tách file thành subcomponent: `ProductGallery.vue` (thumbnail + zoom), `ProductBuyBox.vue` (option/quantity/CTA/quick-buy/sticky bar), `ProductRelated.vue` (related grid) — đưa file chính về ~150 dòng composition, giảm phạm vi re-render khi đổi `quantity`.
- [ ] Đổi cả 5 vị trí `<img>` → `<NuxtImg>`; ảnh zoom lens dùng nguồn tối ưu riêng thay vì full-res.
- [ ] Xoá 2 block `<p>` comment-out.

#### `pages/san-pham/danh-muc/[slug].vue` + `pages/san-pham/bo-suu-tap/[slug].vue` (dùng chung `ProductGroupShowcase.vue`)
- P2 ❌ — banner + grid dùng `<img>` raw.
- P5 ❌ — bug 404 giả (xem mục 2.1) do `useProducts.ts` không lộ `categoriesError`/`collectionsError`.
- C4 ⚠️ — block "group switcher" comment-out 18 dòng + 1 block `<p>` khác trong `ProductGroupShowcase.vue`.
- C3 ⚠️ — `h-[200px] md:h-[250px]` hardcode đè lên `aspect-[4/5]` trên cùng 1 phần tử (dòng ~123-125), 2 rule đè nhau tuỳ độ rộng card.

**Task:**
- [ ] Expose `categoriesError`/`collectionsError` từ `useProducts()` (bọc try/catch giống `getBySlug`), sửa cả 2 trang dùng `error` thay vì suy luận từ `pending && length`.
- [ ] Đổi `<img>` → `<NuxtImg>` trong `ProductGroupShowcase.vue`.
- [ ] Xoá 2 block comment-out.
- [ ] Bỏ 1 trong 2 rule `h-[...]` / `aspect-[4/5]` đang xung đột.

#### `pages/san-pham/chu-de/[slug].vue`
- P2 ❌ — banner + grid `<img>` raw.
- P5 ❌ — bug 404 giả nặng nhất trong nhóm này: `useTopics.ts → getTopicBySlug` nuốt mọi lỗi kể cả 500/timeout, còn `console.warn`/`console.error` sót lại trong code production.
- C4 (trùng lặp) ❌ — tự viết lại lưới sản phẩm + skeleton + empty state thay vì tái dùng `ProductGroupShowcase.vue`/`ProductCatalog.vue` (xem mục 2.7).

**Task:**
- [ ] Sửa `useTopics.ts:getTopicBySlug` theo pattern `isNotFoundError` + rethrow (mục 2.1).
- [ ] Xoá `console.warn`/`console.error` sót lại (dòng ~46, ~67).
- [ ] Đổi `<img>` → `<NuxtImg>`.
- [ ] Cân nhắc gộp lưới sản phẩm vào component `ProductGrid` dùng chung (mục 2.7).

---

### Nhóm C — Blog (`tin-tuc/*`) & Trải nghiệm (`trai-nghiem/*`)

#### `pages/tin-tuc/index.vue`
- P2 ❌ — `BlogTopics.vue`, `BlogList.vue` dùng `<img loading="lazy">` raw, không phải `NuxtImg`.
- P4 (pagination) ❌ — `useBlog()` fetch `?limit=50` 1 lần, render hết trong 1 lưới, không phân trang/"xem thêm" — ổn ở quy mô hiện tại nhưng sẽ chậm dần khi tăng nội dung.
- C4 (trùng cấu trúc) ⚠️ — xem mục 2.6.

**Task:**
- [ ] Đổi `<img>` → `<NuxtImg>` trong `BlogTopics.vue`, `BlogList.vue`.
- [ ] Thêm "xem thêm"/phân trang khi số bài > ~50.

#### `pages/tin-tuc/[slug].vue` (404 dòng)
- P1 ✅ (SEO động + JSON-LD `useArticleStructuredData`).
- P2 ❌ — cover banner + related-posts grid dùng `<img>` raw (nội dung TipTap qua `v-html` đã tự có `loading="lazy"`, chấp nhận được vì không thể dùng `NuxtImg` cho HTML tự do).
- P5 ✅ — làm đúng chuẩn, phân biệt 404 thật.
- C1 ⚠️ — 1 composable call đặt sai vị trí (sau block throw 404 thay vì gom cùng các composable khác).
- C4 ❌ — logic check 404 bị lặp 2 lần (1 block chạy 1 lần lúc setup + 1 `watchEffect` làm lại y hệt) — block đầu redundant, có thể xoá.
- C3 ⚠️ — magic number `-mt-[72px]`, `top-[220px]` hardcode dù đã có hằng số `HEADER_HEIGHT` trong `useHeaderBanner.ts`.

**Task:**
- [ ] Xoá block check 404 không-reactive bị trùng, chỉ giữ `watchEffect`.
- [ ] Đổi `<img>` → `<NuxtImg>` (2 vị trí).
- [ ] Tham chiếu `HEADER_HEIGHT` thay vì hardcode `72px`.
- [ ] (Tuỳ chọn) Tách phần related-posts + sidebar thành component dùng chung với `trai-nghiem/[slug].vue`.

#### `pages/tin-tuc/chu-de/[slug].vue`
- P2 ❌ — banner + grid `<img>` raw.
- P4 ⚠️ — `getPostsByTopicSlug` fetch `?limit=100` không phân trang.
- P5 ❌ — bug 404 giả (mục 2.1).
- C4 ❌ — 1 block `<time>` comment-out còn sót (dòng ~125).
- C3 ⚠️ — magic number `-mt-[72px]`, `top-[210px]`.

**Task:**
- [ ] Sửa `useBlog.ts:getTopicBySlug` theo pattern `isNotFoundError` (mục 2.1).
- [ ] Đổi `<img>` → `<NuxtImg>`.
- [ ] Xoá block `<time>` comment-out.
- [ ] Tham chiếu `HEADER_HEIGHT`.

#### `pages/trai-nghiem/index.vue`
- P2 ❌ — card sự kiện sắp tới + đã qua đều `<img>` raw.
- P4 ❌ — `useEvents.ts` fetch `?limit=50`, render hết, không phân trang.
- C4 (trùng cấu trúc) ❌ — không tái dùng `LayoutPageHero`, tự dựng header riêng lệch spacing (mục 2.6).

**Task:**
- [ ] Đổi `<img>` → `<NuxtImg>` (2 vị trí).
- [ ] Refactor header dùng `LayoutPageHero` thay vì tự viết lại.
- [ ] Thêm phân trang khi số sự kiện tăng.

#### `pages/trai-nghiem/[slug].vue` (400 dòng)
- P1 ⚠️ — có SEO cơ bản nhưng **thiếu JSON-LD `Event` schema** (so với bài blog có `Article` schema) — lệch chuẩn giữa 2 vertical.
- P2 ❌ — hero image `<img>` raw.
- P5 ❌ — **bug 404 giả nghiêm trọng nhất trong toàn bộ audit**: `useEvents.getBySlug` nuốt mọi lỗi, không có local fallback JSON như blog, `watchEffect` ở page không đọc `error` từ `useAsyncData` — một lỗi mạng/backend tạm thời sẽ khiến trang sự kiện thật báo 404.
- C4 (trùng lặp) ❌ — ~75 dòng CSS `.article-body :deep(...)` copy y hệt từ `tin-tuc/[slug].vue`.
- C1 ⚠️ — method và computed xen kẽ nhau thay vì gom nhóm.

**Task (ưu tiên cao — đây là bug thật, không chỉ code sạch):**
- [ ] Sửa `useEvents.ts:getBySlug` theo pattern `isNotFoundError` + rethrow (mục 2.1) — **ưu tiên cao nhất trong cả file này**.
- [ ] Cập nhật `watchEffect` ở page để đọc `error` từ `useAsyncData` trước khi throw 404, giống `tin-tuc/[slug].vue`.
- [ ] Đổi `<img>` → `<NuxtImg>`.
- [ ] Tách block CSS `.article-body` dùng chung với `tin-tuc/[slug].vue`.
- [ ] Thêm JSON-LD `Event` schema tương đương `useArticleStructuredData`.

#### `pages/trai-nghiem/chu-de/[slug].vue`
- P2 ❌ — banner + grid `<img>` raw.
- P5 ❌ — bug 404 giả, cùng gốc với `tin-tuc/chu-de/[slug].vue` vì `useTopicsByType.getTopicBySlug` gần như bản sao của `useBlogTopics.getTopicBySlug` (mục 2.1).
- C3 ⚠️ — magic number `-mt-[72px]`, `top-[210px]`.

**Task:**
- [ ] Sửa `useTopics.ts` (`useTopicsByType`) theo pattern `isNotFoundError` (mục 2.1) — cân nhắc gộp chung với fix của `useBlogTopics` để không sửa 2 lần.
- [ ] Đổi `<img>` → `<NuxtImg>`.
- [ ] Tham chiếu `HEADER_HEIGHT`.

---

### Nhóm D — Giỏ hàng / Thanh toán / Tài khoản / Khác

#### `pages/gio-hang.vue` (291 dòng)
- P1 ⚠️ — chỉ có `title`, thiếu `robots: noindex` (mục 2.5).
- P2 ❌ — thumbnail sản phẩm trong giỏ dùng `<img>` raw.
- P3 ✅ — cart được nạp qua plugin `storefront.ts` lúc client init (đúng pattern), `onMounted` chỉ dùng cho `fetchPaymentMethods`/`fetchProfile` (client-only hợp lệ).
- Money-relevant logic ✅ — totals lấy thẳng từ response Medusa, không tính toán phía client rồi tin tưởng.
- C4 ❌ — `updateCart`/`removeFromCart` nuốt lỗi bằng `console.error`, không báo UI (mục 2.4).

**Task:**
- [ ] Đổi `<img>` → `<NuxtImg>` cho thumbnail giỏ hàng.
- [ ] Thêm `robots: noindex`.
- [ ] Sửa `useCart.ts` trả `{success, message}` cho `updateCart`/`removeFromCart` (giống `checkout`/`applyPromoCode` đã làm đúng), hiển thị lỗi ra UI.

#### `pages/thanh-toan/ket-qua.vue`
- P1 ⚠️ — thiếu `robots: noindex`.
- Bảo mật nhẹ ⚠️ — trạng thái thành công dựa hoàn toàn vào query param `?status=` do client tự set được, không re-verify với backend (không có dữ liệu nhạy cảm nên rủi ro thấp, nhưng nên xác thực qua `lookupOrder`).

**Task:**
- [ ] Thêm `robots: noindex`.
- [ ] Cân nhắc gọi `lookupOrder`/API xác thực đơn hàng thay vì chỉ tin `?status=`.

#### `pages/tai-khoan.vue` (225 dòng)
- P1 ⚠️ — thiếu `robots: noindex`.
- P3 ✅ — `onMounted` fetch đúng vì phụ thuộc trạng thái đăng nhập client-side (không phải anti-pattern ở đây).
- C4 ❌ — `fetchAppointments()`/`fetchOrders()` nuốt lỗi trả `[]`, UI hiện "chưa có đơn hàng" giống hệt trường hợp lỗi thật (mục 2.4) — rủi ro cao nhất trong nhóm D vì người dùng có đơn thật có thể tưởng nhầm là không có.

**Task:**
- [ ] Sửa `useCustomerAuth.ts` để `fetchAppointments`/`fetchOrders` trả kết quả phân biệt được lỗi vs rỗng thật, hiển thị trạng thái "lỗi tải — thử lại" riêng biệt.
- [ ] Bọc try/catch quanh block `onMounted` (dòng ~25-31).
- [ ] Thêm `robots: noindex`.

#### `pages/tra-cuu-don.vue`
Trang sạch nhất nhóm D — error handling đúng chuẩn (`lookupOrder` trả `{success, message}`, không nuốt lỗi).
- P1 ⚠️ — thiếu `robots: noindex`.
- Bảo mật nhẹ ⚠️ — số điện thoại gửi qua query string GET, sẽ lưu lại trong log/history — ưu tiên thấp, cân nhắc đổi sang POST nếu backend hỗ trợ.

**Task:**
- [ ] Thêm `robots: noindex`.
- [ ] (Tuỳ chọn, ưu tiên thấp) Đổi lookup sang POST để không lộ SĐT qua query string.

#### `pages/gallery.vue`
Trang sạch — không có finding cần fix. `NuxtImg` đúng chuẩn, `useAsyncData` đúng chuẩn, không có gì cần sửa.

**Task:** Không có việc cần làm. (Tuỳ chọn UX: thêm lightbox click-to-enlarge — không phải bug.)

#### `pages/lang-nghe.vue`
Trang tĩnh hoàn toàn, không có finding.

**Task:** Không có việc cần làm.

#### `pages/qua-tang-doanh-nghiep.vue` (218 dòng)
- P2 ✅ — `NuxtImg` dùng đúng chuẩn (hero có `priority`, ảnh khác có `loading="lazy"`).
- P3 ❌ — **fetch nguyên catalog 100 sản phẩm** (`useProducts()` limit=100, full field selection) chỉ để lọc client-side theo slug/title chứa "quà"/"qua-" — nên lọc server-side qua category/collection/metadata flag thay vì tải + transform toàn bộ catalog.
- C3 ⚠️ — inline `style="transition-delay: ...ms"` lặp lại 6 lần thay vì Tailwind `delay-[100ms]`.

**Task:**
- [ ] Lọc sản phẩm quà tặng server-side (category/collection riêng hoặc `metadata.is_gift`) thay vì tải toàn bộ catalog rồi lọc client.
- [ ] Đổi 6 chỗ inline `style="transition-delay"` sang class Tailwind `delay-[...]`.

---

## 4. Thứ tự ưu tiên đề xuất

1. **Bug 404 giả** (mục 2.1) — ảnh hưởng trực tiếp đến trải nghiệm người dùng thật (trang sống bị báo "không tìm thấy"), đặc biệt `trai-nghiem/[slug].vue` vì không có fallback.
2. **Lỗi bị nuốt ở giỏ hàng/tài khoản** (mục 2.4) — ảnh hưởng đến luồng có tiền, người dùng thao tác thất bại mà không biết.
3. **`<NuxtImg>` cho `ProductCatalog.vue` + `san-pham/[slug].vue`** (mục 2.2) — 2 trang traffic cao nhất, thắng lợi performance rõ nhất.
4. **`robots: noindex`** cho 4 trang giao dịch (mục 2.5) — fix nhanh, ảnh hưởng SEO/index chất lượng.
5. Phần còn lại của mục 2.2 (`<NuxtImg>` cho các trang khác), dead code, tách `san-pham/[slug].vue` thành subcomponent, gộp component lưới sản phẩm trùng lặp.
6. Dọn dẹp nhỏ: biến không dùng, comment-out, magic number `HEADER_HEIGHT`, xoá `useApi.ts`.
