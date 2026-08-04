import { MedusaError } from "@medusajs/framework/utils"

function parseNonNegativeInteger(
  value: unknown,
  fallback: number,
  name: string
): number {
  if (value === undefined || value === null || value === "") return fallback
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${name} must be a non-negative integer`
    )
  }
  return parsed
}

export function parsePagination(
  query: Record<string, unknown>,
  defaults: { limit: number; max: number }
): { limit: number; offset: number } {
  const requestedLimit = parseNonNegativeInteger(
    query.limit,
    defaults.limit,
    "limit"
  )
  const offset = parseNonNegativeInteger(query.offset, 0, "offset")
  return {
    limit: Math.min(requestedLimit, defaults.max),
    offset,
  }
}
