import type { ExecArgs } from "@medusajs/framework/types"
import { CAMPAIGN_MODULE } from "../modules/campaign"
import type CampaignModuleService from "../modules/campaign/service"

/** TipTap doc helpers */
function text(value: string) {
  return { type: "text" as const, text: value }
}

function paragraph(...parts: string[]) {
  return {
    type: "paragraph" as const,
    content: parts.map(text),
  }
}

function heading(value: string, level = 2) {
  return {
    type: "heading" as const,
    attrs: { level },
    content: [text(value)],
  }
}

function bulletList(items: string[]) {
  return {
    type: "bulletList" as const,
    content: items.map((item) => ({
      type: "listItem" as const,
      content: [paragraph(item)],
    })),
  }
}

function doc(...nodes: object[]) {
  return { type: "doc" as const, content: nodes }
}

/** Kept for legacy URL /tin-tuc/welcome-to-our-store — content is Vietnamese editorial. */
const WELCOME_POST = {
  title: "Chào mừng đến Thăng Long Chè Việt",
  slug: "welcome-to-our-store",
  topicSlug: "nep-tra-viet",
  description:
    "Hành trình khám phá hương vị trà Việt — từ đồi chè mù sương sớm đến tách trà ấm trong tay bạn.",
  thumbnail:
    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80",
  publishAt: "2026-03-01T08:00:00.000Z",
  content: doc(
    heading("Một tách trà — cả một câu chuyện Việt"),
    paragraph(
      "Chào mừng bạn đến với Thăng Long Chè Việt — nơi chúng tôi gìn giữ tinh hoa trà nước, kể lại hành trình từ lá chè non trên đồi cao đến khoảnh khắc rót trà mời khách trong không gian ấm áp.",
    ),
    paragraph(
      "Mỗi sản phẩm ở đây không chỉ để uống. Trà Thái Nguyên mang mùi cốm non của buổi sáng sớm; trà sen Tây Hồ như làn gió hồ sen; trà Shan tuyết vùng cao ẩn chứa sự tĩnh lặng của núi rừng. Chúng tôi chọn từng búp, ướp từng hương, đóng gói từng hộp quà — tất cả để bạn cảm nhận được trọn vẹn nếp trà Việt.",
    ),
    heading("Bạn có thể bắt đầu từ đâu?", 3),
    bulletList([
      "Ghé mục Sản phẩm để chọn trà uống hàng ngày hoặc quà biếu cao cấp.",
      "Đọc Tin tức để tìm hiểu cách pha trà, bảo quản và văn hóa thưởng trà.",
      "Liên hệ đội ngũ tư vấn nếu bạn cần set quà doanh nghiệp theo yêu cầu riêng.",
    ]),
    paragraph(
      "Rất mong được đồng hành cùng bạn trên hành trình thưởng trà — chậm lại một nhịp, nâng tách trà, và để hương thảo mộc kể câu chuyện của riêng mình.",
    ),
  ),
}

const POSTS = [
  {
    title: "Nghệ thuật thưởng trà Việt",
    slug: "nghe-thuat-thuong-tra-viet",
    topicSlug: "nep-tra-viet",
    description:
      "Khám phá tinh hoa trà Việt cùng những bí quyết chọn, pha và thưởng trà để cảm nhận trọn vẹn hương vị truyền thống.",
    thumbnail:
      "https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=1200&q=80",
    publishAt: "2026-02-26T08:00:00.000Z",
    content: doc(
      heading("Giữ trọn nhịp chậm trong tách trà"),
      paragraph(
        "Thưởng trà Việt không chỉ là thói quen uống nước — đó là cách con người lắng lại, lắng nghe hương thảo mộc và chia sẻ khoảnh khắc bình an bên người thân. Một ấm trà đúng điệu bắt đầu từ việc chọn lá tươi, sạch, được hái và chế biến cẩn trọng.",
      ),
      paragraph(
        "Tại Thăng Long Chè Việt, chúng tôi tin rằng mỗi búp trà mang theo câu chuyện của vùng đất: đồi chè Thái Nguyên mùi cốm non, trà Shan tuyết vùng cao thanh mát, hay trà sen Tây Hồ dịu hương. Người thưởng trà khéo léo cảm nhận sự thay đổi của nước — từ vị chát nhẹ, chuyển ngọt hậu, rồi đọng lại dư vị trong khoang miệng.",
      ),
      heading("Ba nguyên tắc pha trà truyền thống", 3),
      bulletList([
        "Rửa ấm, tráng chén bằng nước sôi để giữ nhiệt và làm sạch dụng cụ.",
        "Dùng nước 80–95°C tùy loại trà; không dùng nước sôi 100°C với trà xanh non.",
        "Ủ vừa đủ — thường 30 giây đến 2 phút — rót từng vòng, không để lá ngâm quá lâu.",
      ]),
      paragraph(
        "Khi trà được pha đúng cách, không gian thưởng trà trở thành nghi thức gắn kết: mời trà, đáp lời, trò chuyện nhẹ nhàng. Đó chính là nếp trà Việt mà chúng tôi muốn gìn giữ và lan tỏa.",
      ),
    ),
  },
  {
    title: "5 loại trà tốt cho sức khỏe",
    slug: "5-loai-tra-tot-cho-suc-khoe",
    topicSlug: "nep-tra-viet",
    description:
      "Từ trà xanh Thái Nguyên đến trà thảo mộc — những lựa chọn giúp thư giãn và bồi bổ mỗi ngày.",
    thumbnail:
      "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=1200&q=80",
    publishAt: "2026-02-20T08:00:00.000Z",
    content: doc(
      heading("Trà xanh — thanh mát, tỉnh táo"),
      paragraph(
        "Trà xanh Thái Nguyên giàu chất chống oxy hóa, phù hợp uống buổi sáng hoặc sau bữa trưa nhẹ. Vị chát dịu kèm hậu ngọt giúp tinh thần sảng khoái mà không gây kích thích quá mức.",
      ),
      heading("Trà thảo mộc — dịu nhẹ, an lành", 3),
      paragraph(
        "Hoa cúc, sen, gừng mật ong… là những lựa chọn quen thuộc trong gian bếp Việt. Một tách trà thảo mộc cuối ngày giúp cơ thể thư giãn, chuẩn bị cho giấc ngủ sâu.",
      ),
      bulletList([
        "Trà sen: thanh nhiệt, dễ uống cả ngày.",
        "Trà Shan tuyết: vị đậm, ấm bụng, thích hợp tiết se lạnh.",
        "Trà Oolong: cân bằng giữa xanh và đen, hương hoa nhẹ.",
        "Trà hoa cúc mật ong: dưỡng sinh, dễ pha cho cả gia đình.",
        "Trà đinh ngọc: quà biếu cao cấp, vị ngọt sâu, lưu hương lâu.",
      ]),
      paragraph(
        "Dù chọn loại nào, hãy ưu tiên nguồn trà rõ ràng, bảo quản khô ráo và pha với nước sạch — đó là nền tảng để mỗi tách trà thực sự tốt cho sức khỏe.",
      ),
    ),
  },
  {
    title: "Cách pha trà ngon đúng điệu",
    slug: "cach-pha-tra-ngon-dung-dieu",
    topicSlug: "nep-tra-viet",
    description:
      "Nhiệt độ nước, thời gian ủ và dụng cụ pha — bí quyết để mỗi ấm trà đều đậm đà hương vị.",
    thumbnail:
      "https://images.unsplash.com/photo-1563822249548-9a72b6353cd1?auto=format&fit=crop&w=1200&q=80",
    publishAt: "2026-02-16T08:00:00.000Z",
    content: doc(
      heading("Chuẩn bị dụng cụ và nước"),
      paragraph(
        "Ấm trà, chén hoặc ly sứ/tách thủy tinh đều được, miễn sạch và đã được tráng nóng. Nước nên lọc kỹ; với trà xanh non, để nước sôi nguội khoảng 2–3 phút trước khi pha.",
      ),
      heading("Tỷ lệ và thời gian ủ gợi ý", 3),
      bulletList([
        "Trà xanh: 3–5g / 150ml, ủ 45–90 giây.",
        "Trà Oolong: 5–7g / 150ml, rót nhanh 3–5 lần đầu.",
        "Trà sen: 4–6g / 150ml, ủ 60–90 giây để hương sen nở đều.",
        "Trà thảo mộc: 2–3g / 200ml, có thể hãm lâu hơn tùy khẩu vị.",
      ]),
      paragraph(
        "Pha trà là kỹ năng được mài dần theo thời gian. Hãy thử, ghi chú và điều chỉnh — khi tìm được nhịp pha riêng, mỗi ấm trà sẽ là trải nghiệm đáng nhớ.",
      ),
    ),
  },
  {
    title: "Trà sen Tây Hồ — tinh hoa Hà thành",
    slug: "tra-sen-tay-ho-tinh-hoa-ha-thanh",
    topicSlug: "van-hoa-viet-lang-nghe",
    description:
      "Hương sen quyện trong từng búp trà, mang đến trải nghiệm thanh tao đặc trưng của Hà Nội.",
    thumbnail:
      "https://images.unsplash.com/photo-1582793988951-9aed5509eb97?auto=format&fit=crop&w=1200&q=80",
    publishAt: "2026-02-08T08:00:00.000Z",
    content: doc(
      heading("Công đoạn ướp sen — tinh tế từng búp trà"),
      paragraph(
        "Trà sen Tây Hồ nổi tiếng bởi quy trình ướp hoa sen Bách Diệp qua nhiều lần, để hương thấm sâu mà không át vị trà. Đây là minh chứng cho sự kiên nhẫn và bàn tay nghệ nhân làng nghề Hà Nội.",
      ),
      paragraph(
        "Khi thưởng thức, bạn sẽ cảm nhận hương sen thoang thoảng, vị trà thanh ngọt và hậu vị dài. Trà sen là lựa chọn quà biếu tinh tế, phù hợp đối tác, người thân và những dịp cần sự trang trọng.",
      ),
      heading("Gợi ý thưởng thức", 3),
      bulletList([
        "Pha nhẹ, không dùng nước quá sôi để giữ hương sen.",
        "Thưởng trà trong không gian yên tĩnh, tránh mùi nồng che hương trà.",
        "Kết hợp bánh mứt ít ngọt để trải nghiệm trọn vẹn hơn.",
      ]),
    ),
  },
]

/**
 * Seeds editorial campaign posts in Vietnamese.
 * welcome-to-our-store is upserted (legacy slug); other slugs are create-if-missing.
 *
 * Run: npx medusa exec ./src/scripts/seed-campaign-posts.ts
 */
export default async function seedCampaignPosts({ container }: ExecArgs) {
  const campaignModuleService: CampaignModuleService =
    container.resolve(CAMPAIGN_MODULE)

  const topics = await campaignModuleService.listCampaignTopics({})
  const topicBySlug = new Map(topics.map((t) => [t.slug, t.id]))

  type PostSeed = (typeof POSTS)[number] | typeof WELCOME_POST

  const upsertPost = async (post: PostSeed, forceUpdate = false) => {
    const existing = await campaignModuleService.listCampaignPosts({
      slug: post.slug,
    })
    const topicId = topicBySlug.get(post.topicSlug) ?? null
    const payload = {
      title: post.title,
      slug: post.slug,
      description: post.description,
      thumbnail: post.thumbnail,
      topic_id: topicId,
      is_active: true,
      publish_at: new Date(post.publishAt),
      unpublish_at: null as Date | null,
      source: "Thăng Long Chè Việt",
      content: post.content,
    }

    if (existing.length) {
      if (forceUpdate) {
        await campaignModuleService.updateCampaignPosts({
          id: existing[0]!.id,
          ...payload,
        })
        console.log(`Campaign post updated: ${post.slug}`)
        return "updated" as const
      }
      return "skipped" as const
    }

    await campaignModuleService.createCampaignPosts(payload)
    console.log(`Campaign post created: ${post.slug}`)
    return "created" as const
  }

  let created = 0
  let updated = 0
  let skipped = 0

  const welcomeResult = await upsertPost(WELCOME_POST, true)
  if (welcomeResult === "created") created++
  else if (welcomeResult === "updated") updated++
  else skipped++

  for (const post of POSTS) {
    const result = await upsertPost(post)
    if (result === "created") created++
    else skipped++
  }

  console.log(
    `seed-campaign-posts: ${created} created, ${updated} updated, ${skipped} skipped.`,
  )
}
