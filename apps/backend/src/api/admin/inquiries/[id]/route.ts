import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { INQUIRY_MODULE } from "../../../../modules/inquiry"
import type InquiryModuleService from "../../../../modules/inquiry/service"

const STATUSES = ["new", "confirmed", "completed", "cancelled"] as const

/**
 * GET /admin/inquiries/:id
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const inquiryService: InquiryModuleService = req.scope.resolve(INQUIRY_MODULE)

  const [inquiry] = await inquiryService.listInquiries({ id }, { take: 1 })
  if (!inquiry) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Inquiry not found")
  }

  res.json({ inquiry })
}

/**
 * PATCH /admin/inquiries/:id — update inquiry status.
 */
export async function PATCH(
  req: MedusaRequest<{ status?: string }>,
  res: MedusaResponse
) {
  const { id } = req.params
  const status = req.body?.status

  if (!status || !STATUSES.includes(status as (typeof STATUSES)[number])) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `status must be one of: ${STATUSES.join(", ")}`
    )
  }

  const inquiryService: InquiryModuleService = req.scope.resolve(INQUIRY_MODULE)
  const [existing] = await inquiryService.listInquiries({ id }, { take: 1 })
  if (!existing) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Inquiry not found")
  }

  const updated = await inquiryService.updateInquiries({
    id,
    status: status as (typeof STATUSES)[number],
  })
  res.json({ inquiry: updated })
}
