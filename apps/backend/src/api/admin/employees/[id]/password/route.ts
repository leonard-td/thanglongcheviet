import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { z } from "zod"
import { retrieveEmployee, setEmailPassPassword } from "../../helpers"

const SetPasswordSchema = z.object({
  password: z.string().min(8),
})

/**
 * POST /admin/employees/:id/password — admin force-set password (no invite/reset email).
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const body = SetPasswordSchema.parse(req.body)
  const employee = await retrieveEmployee(req, req.params.id)

  await setEmailPassPassword(req, employee.email, body.password)

  res.json({ success: true })
}
