import {
  authenticate,
  defineMiddlewares,
  validateAndTransformQuery,
} from "@medusajs/framework/http"
import { createFindParams } from "@medusajs/medusa/api/utils/validators"
import multer from "multer"
import os from "node:os"
import path from "node:path"

export const GetCampaignPostsSchema = createFindParams()
export const GetEventsSchema = createFindParams()

// File zip backup có thể rất lớn — nhận qua multer diskStorage (stream thẳng
// xuống đĩa tạm, không qua bodyParser/RAM). Request JSON (restore từ file có
// sẵn trên server) không phải multipart nên multer tự bỏ qua.
const backupUpload = multer({
  dest: path.join(os.tmpdir(), "tlcv-backup-uploads"),
  limits: { fileSize: 4 * 1024 * 1024 * 1024 },
})

export default defineMiddlewares({
  routes: [
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
