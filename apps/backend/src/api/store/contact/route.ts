import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { INQUIRY_MODULE } from "../../../modules/inquiry"
import type InquiryModuleService from "../../../modules/inquiry/service"
import { CARE_CHANNEL_MODULE } from "../../../modules/care-channel"
import type CareChannelModuleService from "../../../modules/care-channel/service"
import { formatInquiryMessage } from "../../../modules/care-channel/utils/format"
import { normalizePhone } from "../../utils/phone"

type ContactBody = {
  name?: string
  phone?: string
  email?: string
  service?: string
  message?: string
  source?: string
}

/**
 * POST /store/contact
 *
 * Stores a contact request from the storefront contact form.
 */
export async function POST(
  req: MedusaRequest<ContactBody>,
  res: MedusaResponse
) {
  const { name, phone, email, service, message, source } = req.body ?? {}

  if (!name?.trim() || !phone?.trim()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "name and phone are required"
    )
  }

  const inquiryService: InquiryModuleService = req.scope.resolve(INQUIRY_MODULE)

  const inquiry = await inquiryService.createInquiries({
    type: "contact",
    name: name.trim().slice(0, 200),
    phone: phone.trim().slice(0, 30),
    normalized_phone: normalizePhone(phone),
    email: email?.trim().slice(0, 200) || null,
    normalized_email: email?.trim().toLowerCase().slice(0, 200) || null,
    service: service?.trim().slice(0, 200) || null,
    message: message?.trim().slice(0, 4000) || null,
    source: source?.trim().slice(0, 100) || "website",
  })

  // fire-and-forget: chuyển tiếp lời nhắn tới các kênh CSKH đã tích hợp
  // (Zalo OA, Telegram...) — lỗi gửi không được chặn phản hồi cho khách
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const careService: CareChannelModuleService =
    req.scope.resolve(CARE_CHANNEL_MODULE)
  careService.notifySupportChannels(formatInquiryMessage(inquiry)).catch((error) => {
    logger.warn(
      `care-channel: failed to forward inquiry ${inquiry.id}: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  })

  res.status(201).json({ success: true, inquiry_id: inquiry.id })
}
