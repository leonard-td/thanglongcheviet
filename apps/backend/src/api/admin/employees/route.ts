import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { createUsersWorkflow } from "@medusajs/medusa/core-flows"
import { z } from "zod"
import { zodValidator } from "../../utils/zod-validator"
import { listEmployees, retrieveEmployee } from "./helpers"

const CreateEmployeeSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  first_name: z.string().optional().nullable(),
  last_name: z.string().optional().nullable(),
  role_ids: z.array(z.string()).optional().default([]),
})

/**
 * GET /admin/employees — list admin users with roles + blocked flag.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const limit = Math.min(Number(req.query.limit) || 20, 100)
  const offset = Number(req.query.offset) || 0

  const result = await listEmployees(req, limit, offset)
  res.json(result)
}

/**
 * POST /admin/employees — create user with password (no invite).
 * Mirrors `medusa user -e … -p …` then optional role assignment.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const body = await zodValidator(CreateEmployeeSchema, req.body)
  const authModule = req.scope.resolve(Modules.AUTH)

  const { result: users } = await createUsersWorkflow(req.scope).run({
    input: {
      users: [
        {
          email: body.email.toLowerCase(),
          first_name: body.first_name || undefined,
          last_name: body.last_name || undefined,
          roles: body.role_ids,
        },
      ],
    },
  })

  const user = users[0]
  if (!user) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "User was not created"
    )
  }

  const { authIdentity, error } = await authModule.register("emailpass", {
    body: {
      email: body.email.toLowerCase(),
      password: body.password,
    },
  })

  if (error || !authIdentity) {
    // Roll back user if auth registration failed so we don't leave orphans.
    try {
      const userModule = req.scope.resolve(Modules.USER)
      await userModule.deleteUsers([user.id])
    } catch {
      // best-effort cleanup
    }

    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      error || "Failed to register auth identity"
    )
  }

  await authModule.updateAuthIdentities({
    id: authIdentity.id,
    app_metadata: {
      user_id: user.id,
    },
  })

  const employee = await retrieveEmployee(req, user.id)
  res.status(201).json({ employee })
}
