import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { INQUIRY_MODULE } from "../../../modules/inquiry"
import type InquiryModuleService from "../../../modules/inquiry/service"
import { normalizePhone } from "../../utils/phone"
import { parsePagination } from "../../utils/pagination"

/**
 * GET /store/my-bookings
 *
 * Bookings belonging to the logged-in customer, matched by the phone number
 * (and email) on their customer profile. Requires customer authentication
 * (see src/api/middlewares.ts).
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const customerId = req.auth_context.actor_id

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: customers } = await query.graph({
    entity: "customer",
    fields: ["id", "phone", "email"],
    filters: { id: customerId },
  })
  const customer = customers[0]
  if (!customer) {
    res.json({ bookings: [] })
    return
  }

  const customerPhone = normalizePhone(customer.phone ?? "")
  const customerEmail = customer.email?.trim().toLowerCase() ?? ""
  if (!customerPhone && !customerEmail) {
    res.json({ bookings: [], count: 0, limit: 20, offset: 0 })
    return
  }

  const { limit, offset } = parsePagination(req.query, {
    limit: 20,
    max: 100,
  })
  const inquiryService: InquiryModuleService = req.scope.resolve(INQUIRY_MODULE)
  const ownershipFilters = [
    ...(customerPhone ? [{ normalized_phone: customerPhone }] : []),
    ...(customerEmail ? [{ normalized_email: customerEmail }] : []),
  ]
  const [bookings, count] = await inquiryService.listAndCountInquiries(
    {
      type: "booking",
      $or: ownershipFilters,
    } as never,
    { order: { created_at: "DESC" }, take: limit, skip: offset }
  )

  res.json({
    bookings: bookings.map((b) => ({
      id: b.id,
      service: b.service,
      status: b.status,
      preferred_date: b.preferred_date,
      preferred_time: b.preferred_time,
      note: b.message,
      created_at: b.created_at,
    })),
    count,
    limit,
    offset,
  })
}
