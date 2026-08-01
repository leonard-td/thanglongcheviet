import {
  authenticate,
  defineMiddlewares,
  type MedusaRequest,
  type MedusaResponse,
  validateAndTransformQuery,
} from "@medusajs/framework/http"
import { createFindParams } from "@medusajs/medusa/api/utils/validators"
import multer from "multer"
import os from "node:os"
import path from "node:path"
import { migratePrivateExportsFromStaticSync } from "../lib/private-exports/migrate"

migratePrivateExportsFromStaticSync()

export const GetCampaignPostsSchema = createFindParams()
export const GetEventsSchema = createFindParams()

// File zip backup có thể rất lớn — nhận qua multer diskStorage (stream thẳng
// xuống đĩa tạm, không qua bodyParser/RAM). Request JSON (restore từ file có
// sẵn trên server) không phải multipart nên multer tự bỏ qua.
const backupUpload = multer({
  dest: path.join(os.tmpdir(), "tlcv-backup-uploads"),
  limits: { fileSize: 4 * 1024 * 1024 * 1024 },
})

type RateBucket = { count: number; resetAt: number }
const rateBuckets = new Map<string, RateBucket>()

function rateLimit(name: string, max: number, windowMs: number) {
  return (req: MedusaRequest, res: MedusaResponse, next: () => void) => {
    const forwarded = req.headers["x-forwarded-for"]
    const ip =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0])
        ?.trim() ||
      req.ip ||
      "unknown"
    const key = `${name}:${ip}`
    const now = Date.now()
    const current = rateBuckets.get(key)
    const bucket =
      !current || current.resetAt <= now
        ? { count: 0, resetAt: now + windowMs }
        : current

    bucket.count += 1
    rateBuckets.set(key, bucket)

    if (rateBuckets.size > 10_000) {
      for (const [bucketKey, value] of rateBuckets) {
        if (value.resetAt <= now) rateBuckets.delete(bucketKey)
      }
    }

    res.setHeader(
      "RateLimit-Remaining",
      String(Math.max(0, max - bucket.count))
    )
    if (bucket.count > max) {
      res.setHeader(
        "Retry-After",
        String(Math.ceil((bucket.resetAt - now) / 1000))
      )
      res.status(429).json({
        code: "rate_limit_exceeded",
        message: "Too many requests. Please try again later.",
      })
      return
    }

    next()
  }
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/static/private-*",
      method: "GET",
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
    {
      matcher: "/admin/events",
      method: "GET",
      middlewares: [
        validateAndTransformQuery(GetEventsSchema, {
          defaults: [
            "id",
            "title",
            "slug",
            "thumbnail",
            "location",
            "start_at",
            "end_at",
            "capacity",
            "registration_open",
            "is_active",
            "created_at",
          ],
          isList: true,
        }),
      ],
    },
    {
      matcher: "/admin/events",
      method: ["POST"],
      bodyParser: { sizeLimit: "10mb" },
    },
    {
      matcher: "/admin/events/*",
      method: ["PATCH"],
      bodyParser: { sizeLimit: "10mb" },
    },
    {
      matcher: "/store/my-bookings*",
      middlewares: [authenticate("customer", ["bearer", "session"])],
    },
    {
      matcher: "/store/contact",
      method: ["POST"],
      middlewares: [rateLimit("contact", 10, 15 * 60_000)],
    },
    {
      matcher: "/store/bookings",
      method: ["POST"],
      middlewares: [rateLimit("bookings", 10, 15 * 60_000)],
    },
    {
      matcher: "/store/event-registrations",
      method: ["POST"],
      middlewares: [rateLimit("event-registrations", 15, 15 * 60_000)],
    },
    {
      matcher: "/store/order-lookup",
      method: ["GET"],
      middlewares: [rateLimit("order-lookup", 30, 15 * 60_000)],
    },
    {
      matcher: "/admin/backup/restore",
      method: ["POST"],
      middlewares: [backupUpload.single("file")],
    },
    {
      // Zalo ký webhook trên raw body — cần giữ lại để verify chữ ký
      matcher: "/webhooks/zalo/*",
      method: ["POST"],
      bodyParser: { preserveRawBody: true },
    },
    {
      matcher: "/admin/campaign-posts",
      method: "GET",
      middlewares: [
        validateAndTransformQuery(GetCampaignPostsSchema, {
          defaults: [
            "id",
            "title",
            "slug",
            "thumbnail",
            "topic_id",
            "is_active",
            "publish_at",
            "unpublish_at",
            "created_at",
          ],
          isList: true,
        }),
      ],
    },
    {
      matcher: "/admin/campaign-posts",
      method: ["POST"],
      bodyParser: { sizeLimit: "10mb" },
    },
    {
      matcher: "/admin/campaign-posts/*",
      method: ["PATCH"],
      bodyParser: { sizeLimit: "10mb" },
    },
    {
      matcher: "/admin/site-settings",
      method: ["POST"],
      bodyParser: { sizeLimit: "10mb" },
    },
  ],
})
