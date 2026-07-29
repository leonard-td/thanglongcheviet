import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"

/**
 * Validate route input and convert Zod failures to a client-facing Medusa 400.
 *
 * Medusa 2.17 doesn't export `zodValidator` from
 * `@medusajs/framework/zod`, so custom routes use this small adapter.
 */
export function zodValidator<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input)

  if (!result.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      z.prettifyError(result.error)
    )
  }

  return result.data
}
