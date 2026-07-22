import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { checkRateLimit, clientIp } from "../../lib/rate-limit"

type RateLimitOptions = {
  limit: number
  windowMs: number
  name: string
}

export async function enforceStoreRateLimit(
  req: MedusaRequest,
  res: MedusaResponse,
  opts: RateLimitOptions,
): Promise<boolean> {
  const ip = clientIp(req)
  const key = `${opts.name}:${ip}`
  const { allowed, retryAfterSec } = await checkRateLimit(key, opts.limit, opts.windowMs)
  if (allowed) return true

  res.setHeader("Retry-After", String(retryAfterSec))
  throw new MedusaError(
    MedusaError.Types.NOT_ALLOWED,
    "Too many requests. Please try again later.",
  )
}
