import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import type NavigationModuleService from "../../../modules/navigation/service"

const NavigationFieldsSchema = z.object({
  label: z.string().trim().min(1).max(255),
  url: z.string().trim().min(1).max(2048),
  order: z.number().int().finite(),
  openInNewTab: z.boolean(),
  parent_id: z.string().trim().min(1).nullable(),
  is_active: z.boolean(),
})

export const CreateNavigationItemSchema = NavigationFieldsSchema.partial({
  order: true,
  openInNewTab: true,
  parent_id: true,
  is_active: true,
}).strict()

export const UpdateNavigationItemSchema = NavigationFieldsSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: "At least one navigation field must be provided",
  }
)

export const validateNavigationInput = <T>(
  schema: z.ZodType<T>,
  input: unknown
): T => {
  const result = schema.safeParse(input)

  if (!result.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      z.prettifyError(result.error)
    )
  }

  return result.data
}

/**
 * Ensures the requested parent exists and walking its ancestors cannot reach
 * the item being updated. The visited set also rejects an already-corrupt
 * parent chain instead of looping forever.
 */
export async function validateParent(
  service: NavigationModuleService,
  parentId: string | null | undefined,
  itemId?: string
) {
  if (!parentId) {
    return
  }

  const visited = new Set<string>()
  let currentId: string | null = parentId

  while (currentId) {
    if (currentId === itemId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "A navigation item cannot be its own parent or descendant"
      )
    }

    if (visited.has(currentId)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "The selected parent belongs to a cyclic navigation hierarchy"
      )
    }
    visited.add(currentId)

    const [parent] = await service.listNavigationItems(
      { id: currentId },
      { take: 1, select: ["id", "parent_id"] }
    )

    if (!parent) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "The selected parent navigation item does not exist"
      )
    }

    currentId = parent.parent_id
  }
}
