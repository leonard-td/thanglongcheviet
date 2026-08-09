import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { INQUIRY_MODULE } from "../../../../modules/inquiry"
import type InquiryModuleService from "../../../../modules/inquiry/service"
import { CARE_CHANNEL_MODULE } from "../../../../modules/care-channel"
import type CareChannelModuleService from "../../../../modules/care-channel/service"
import { formatInquiryMessage } from "../../../../modules/care-channel/utils/format"

type EscalateBody = {
  q?: string
  email?: string
  phone?: string
  name?: string
}

/**
 * POST /store/ask/escalate
 *
 * When Ask cannot answer confidently — store as contact inquiry and notify CSKH.
 */
export async function POST(
  req: MedusaRequest<EscalateBody>,
  res: MedusaResponse
) {
  const q = req.body?.q?.trim()
  const email = req.body?.email?.trim()
  const phone = req.body?.phone?.trim()
  const name = req.body?.name?.trim() || "Ask visitor"

  if (!q) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "q (question) is required"
    )
  }

  if (!email && !phone) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "email or phone is required"
    )
  }

  const inquiryService: InquiryModuleService = req.scope.resolve(INQUIRY_MODULE)

  const inquiry = await inquiryService.createInquiries({
    type: "contact",
    name: name.slice(0, 200),
    phone: (phone || "ask-no-phone").slice(0, 30),
    email: email?.slice(0, 200) || null,
    service: "ask-escalate",
    message: `Ask escalate\nCâu hỏi: ${q.slice(0, 3500)}`.slice(0, 4000),
    source: "ask-messages",
  })

  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const careService: CareChannelModuleService =
    req.scope.resolve(CARE_CHANNEL_MODULE)
  careService.notifySupportChannels(formatInquiryMessage(inquiry)).catch((error) => {
    logger.warn(
      `care-channel: failed to forward ask escalate ${inquiry.id}: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  })

  res.status(201).json({
    success: true,
    inquiry_id: inquiry.id,
    message: "Thanks — our team will follow up.",
  })
}
