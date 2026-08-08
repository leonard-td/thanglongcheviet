import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  removeUserAccountWorkflow,
  updateUsersWorkflow,
} from "@medusajs/medusa/core-flows"
import { z } from "zod"
import { zodValidator } from "../../../utils/zod-validator"
import {
  isBlocked,
  retrieveEmployee,
  syncEmployeeRoles,
} from "../helpers"

const UpdateEmployeeSchema = z.object({
  first_name: z.string().optional().nullable(),
  last_name: z.string().optional().nullable(),
  blocked: z.boolean().optional(),
  role_ids: z.array(z.string()).optional(),
})

/**
 * GET /admin/employees/:id
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const employee = await retrieveEmployee(req, req.params.id)
  res.json({ employee })
}

/**
 * POST /admin/employees/:id — rename, block/unblock, sync roles.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const userId = req.params.id
  const body = await zodValidator(UpdateEmployeeSchema, req.body)
  const existing = await retrieveEmployee(req, userId)

  if (body.blocked === true && req.auth_context?.actor_id === userId) {
    throw new MedusaError(
      MedusaError.Types.FORBIDDEN,
      "You cannot block your own account"
    )
  }

  const nextMetadata: Record<string, unknown> = {
    ...(existing.metadata ?? {}),
  }

  if (typeof body.blocked === "boolean") {
    nextMetadata.blocked = body.blocked
  }

  const hasProfileChange =
    body.first_name !== undefined ||
    body.last_name !== undefined ||
    typeof body.blocked === "boolean"

  if (hasProfileChange) {
    await updateUsersWorkflow(req.scope).run({
      input: {
        updates: [
          {
            id: userId,
            ...(body.first_name !== undefined
              ? { first_name: body.first_name }
              : {}),
            ...(body.last_name !== undefined
              ? { last_name: body.last_name }
              : {}),
            ...(typeof body.blocked === "boolean"
              ? { metadata: nextMetadata }
              : {}),
          },
        ],
      },
    })
  }

  if (body.role_ids) {
    await syncEmployeeRoles(req, userId, body.role_ids)
  }

  const employee = await retrieveEmployee(req, userId)

  // Sanity: blocked flag should reflect what we wrote
  if (typeof body.blocked === "boolean" && employee.blocked !== body.blocked) {
    employee.blocked = isBlocked(employee.metadata)
  }

  res.json({ employee })
}

/**
 * DELETE /admin/employees/:id — soft-delete user account (cannot delete self).
 */
export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const userId = req.params.id

  if (req.auth_context?.actor_id === userId) {
    throw new MedusaError(
      MedusaError.Types.FORBIDDEN,
      "You cannot delete your own account"
    )
  }

  // Ensure exists
  await retrieveEmployee(req, userId)

  await removeUserAccountWorkflow(req.scope).run({
    input: { userId },
  })

  res.status(200).json({
    id: userId,
    object: "employee",
    deleted: true,
  })
}
