import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CAMPAIGN_MODULE } from "../../../../../modules/campaign"
import type CampaignModuleService from "../../../../../modules/campaign/service"

// slug có unique index (WHERE deleted_at IS NULL) nên bản sao phải có slug mới
const generateUniqueSlug = async (
  campaignModuleService: CampaignModuleService,
  baseSlug: string
) => {
  const base = `${baseSlug}-copy`
  let candidate = base

  for (let suffix = 2; ; suffix++) {
    const existing = await campaignModuleService.listCampaignPosts(
      { slug: candidate },
      { take: 1 }
    )

    if (!existing.length) {
      return candidate
    }

    candidate = `${base}-${suffix}`
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  const campaignModuleService: CampaignModuleService =
    req.scope.resolve(CAMPAIGN_MODULE)

  const post = await campaignModuleService.retrieveCampaignPost(id)

  const slug = await generateUniqueSlug(campaignModuleService, post.slug)

  // Bản sao luôn ở trạng thái tạm dừng, không kèm lịch đăng — tránh việc
  // nội dung trùng lặp tự lên website ngay khi nhân bản
  const clone = await campaignModuleService.createCampaignPosts({
    title: `${post.title} (Copy)`,
    slug,
    content: post.content ?? {},
    translations: post.translations ?? null,
    description: post.description ?? null,
    thumbnail: post.thumbnail ?? null,
    topic_id: post.topic_id ?? null,
    is_active: false,
    publish_at: null,
    unpublish_at: null,
    source: post.source ?? null,
    seo_title: post.seo_title ?? null,
    seo_description: post.seo_description ?? null,
    seo_keywords: post.seo_keywords ?? null,
  })

  res.status(201).json({ campaign_post: clone })
}
