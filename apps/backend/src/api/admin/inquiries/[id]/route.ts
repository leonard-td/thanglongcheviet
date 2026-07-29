import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { INQUIRY_MODULE } from "../../../../modules/inquiry"
import type InquiryModuleService from "../../../../modules/inquiry/service"
import { getSlotCapacity } from "../../../../modules/inquiry/service"
import { withDatabaseLock } from "../../../../lib/database-lock"

const STATUSES = ["new", "confirmed", "completed", "cancelled"] as const

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

  const update = () =>
    inquiryService.updateInquiries({
      id,
      status: status as (typeof STATUSES)[number],
    })

  const reactivatesBooking =
    existing.type === "booking" &&
    existing.status === "cancelled" &&
    (status === "new" || status === "confirmed") &&
    existing.preferred_date &&
    existing.preferred_time

  const updated = reactivatesBooking
    ? await withDatabaseLock(
        `booking-slot:${existing.preferred_date}:${existing.preferred_time}`,
        async (client) => {
          const result = await client.query(
            `SELECT count(*)::int AS count
             FROM inquiry
             WHERE deleted_at IS NULL
               AND type = 'booking'
               AND preferred_date = $1
               AND preferred_time = $2
               AND status IN ('new', 'confirmed')`,
            [existing.preferred_date, existing.preferred_time]
          )
          if (Number(result.rows[0]?.count ?? 0) >= getSlotCapacity()) {
            throw new MedusaError(
              MedusaError.Types.NOT_ALLOWED,
              "Reactivating this booking would exceed slot capacity"
            )
          }
          return await update()
        }
      )
    : await update()
  res.json({ inquiry: updated })
}
