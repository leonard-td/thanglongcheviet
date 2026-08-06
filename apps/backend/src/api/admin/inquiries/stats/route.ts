import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INQUIRY_MODULE } from "../../../../modules/inquiry"
import type InquiryModuleService from "../../../../modules/inquiry/service"

/**
 * GET /admin/inquiries/stats
 *
 * Lightweight count of unread (status=new) inquiries for admin badges.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const inquiryService: InquiryModuleService = req.scope.resolve(INQUIRY_MODULE)

  const [, newCount] = await inquiryService.listAndCountInquiries(
    { status: "new" },
    { take: 0, skip: 0 }
  )

  res.json({ new_count: newCount })
}
