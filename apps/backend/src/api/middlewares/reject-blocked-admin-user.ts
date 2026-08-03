import type {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { isBlocked } from "../admin/employees/helpers"

/**
 * Reject requests from users marked `metadata.blocked === true`.
 * Only blocks the blocked actor themselves — other admins can still manage them.
 */
export async function rejectBlockedAdminUser(
  req: AuthenticatedMedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) {
  const actorId = req.auth_context?.actor_id
  const actorType = req.auth_context?.actor_type

  if (!actorId || actorType !== "user") {
    return next()
  }

  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const {
      data: [user],
    } = await query.graph({
      entity: "user",
      fields: ["id", "metadata"],
      filters: { id: actorId },
    })

    if (
      user &&
      isBlocked(user.metadata as Record<string, unknown> | null | undefined)
    ) {
      return next(
        new MedusaError(
          MedusaError.Types.FORBIDDEN,
          "Your account has been blocked. Contact an administrator."
        )
      )
    }
  } catch {
    // If lookup fails, do not hard-fail unrelated routes.
  }

  return next()
}
