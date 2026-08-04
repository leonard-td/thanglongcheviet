import type { AuthenticatedMedusaRequest } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import {
  assignUserRolesWorkflow,
  removeUserRolesWorkflow,
} from "@medusajs/medusa/core-flows"

export type EmployeeRole = {
  id: string
  name: string
}

export type EmployeeDTO = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  metadata: Record<string, unknown> | null
  blocked: boolean
  roles: EmployeeRole[]
  created_at: string
  updated_at: string
}

const USER_FIELDS = [
  "id",
  "email",
  "first_name",
  "last_name",
  "avatar_url",
  "metadata",
  "created_at",
  "updated_at",
  "rbac_roles.id",
  "rbac_roles.name",
] as const

export function isBlocked(metadata: Record<string, unknown> | null | undefined) {
  return metadata?.blocked === true
}

export function toEmployee(user: Record<string, unknown>): EmployeeDTO {
  const metadata = (user.metadata as Record<string, unknown> | null) ?? null
  const roles = ((user.rbac_roles as EmployeeRole[] | undefined) ?? []).map(
    (role) => ({
      id: role.id,
      name: role.name,
    })
  )

  return {
    id: user.id as string,
    email: user.email as string,
    first_name: (user.first_name as string | null) ?? null,
    last_name: (user.last_name as string | null) ?? null,
    avatar_url: (user.avatar_url as string | null) ?? null,
    metadata,
    blocked: isBlocked(metadata),
    roles,
    created_at: user.created_at as string,
    updated_at: user.updated_at as string,
  }
}

export async function retrieveEmployee(
  req: AuthenticatedMedusaRequest,
  userId: string
): Promise<EmployeeDTO> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [user],
  } = await query.graph({
    entity: "user",
    fields: [...USER_FIELDS],
    filters: { id: userId },
  })

  if (!user) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Employee with id "${userId}" not found`
    )
  }

  return toEmployee(user as unknown as Record<string, unknown>)
}

export async function listEmployees(
  req: AuthenticatedMedusaRequest,
  limit: number,
  offset: number
) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: users, metadata } = await query.graph({
    entity: "user",
    fields: [...USER_FIELDS],
    pagination: {
      take: limit,
      skip: offset,
      order: { created_at: "DESC" },
    },
  })

  return {
    employees: (users as unknown as Record<string, unknown>[]).map(toEmployee),
    count: metadata?.count ?? users.length,
    limit,
    offset,
  }
}

export async function syncEmployeeRoles(
  req: AuthenticatedMedusaRequest,
  userId: string,
  nextRoleIds: string[]
) {
  const uniqueNext = Array.from(new Set(nextRoleIds))
  const employee = await retrieveEmployee(req, userId)
  const currentIds = employee.roles.map((role) => role.id)

  const toRemove = currentIds.filter((id) => !uniqueNext.includes(id))
  const toAdd = uniqueNext.filter((id) => !currentIds.includes(id))

  const actor_id = req.auth_context?.actor_id
  const actor = req.auth_context?.actor_type

  if (!actor_id || !actor) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Missing auth context to manage roles"
    )
  }

  if (toRemove.length > 0) {
    await removeUserRolesWorkflow(req.scope).run({
      input: {
        actor_id,
        actor,
        user_id: userId,
        role_ids: toRemove,
      },
    })
  }

  if (toAdd.length > 0) {
    await assignUserRolesWorkflow(req.scope).run({
      input: {
        actor_id,
        actor,
        user_id: userId,
        role_ids: toAdd,
      },
    })
  }
}

export async function setEmailPassPassword(
  req: AuthenticatedMedusaRequest,
  email: string,
  password: string
) {
  const authModule = req.scope.resolve(Modules.AUTH)
  const result = await authModule.updateProvider("emailpass", {
    entity_id: email,
    password,
  })

  if (!result.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      result.error || "Failed to update password"
    )
  }
}
