import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { INQUIRY_MODULE } from "../../../modules/inquiry"
import type InquiryModuleService from "../../../modules/inquiry/service"
import { parsePagination } from "../../utils/pagination"
import { zodValidator } from "../../utils/zod-validator"

const ListInquiriesQuerySchema = z.object({
  type: z.enum(["contact", "booking"]).optional(),
  status: z.enum(["new", "confirmed", "completed", "cancelled"]).optional(),
})

/**
 * GET /admin/inquiries?type=contact|booking&status=new&limit=&offset=
 *
 * Lists storefront inquiries (contact requests + bookings) for back office.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const inquiryService: InquiryModuleService = req.scope.resolve(INQUIRY_MODULE)

  const { limit, offset } = parsePagination(req.query, {
    limit: 50,
    max: 200,
  })

  const filters = await zodValidator(ListInquiriesQuerySchema, {
    type: req.query.type,
    status: req.query.status,
  })
  const [inquiries, count] = await inquiryService.listAndCountInquiries(
    filters,
    {
      take: limit,
      skip: offset,
      order: { created_at: "DESC" },
    }
  )

  res.json({ inquiries, count, limit, offset })
}
