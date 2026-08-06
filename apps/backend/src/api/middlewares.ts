import "../policies/custom"

import {
  authenticate,
  defineMiddlewares,
  validateAndTransformQuery,
  wrapWithPoliciesCheck,
} from "@medusajs/framework/http"
import { toSnakeCase } from "@medusajs/framework/utils"
import { createFindParams } from "@medusajs/medusa/api/utils/validators"
import multer from "multer"
import os from "node:os"
import path from "node:path"
import { rejectBlockedAdminUser } from "./middlewares/reject-blocked-admin-user"

export const GetCampaignPostsSchema = createFindParams()
export const GetEventsSchema = createFindParams()

// definePolicies() stores every resource/operation snake_cased, while
// hasPermission() compares the guard's strings against those stored values
// verbatim. Normalizing here keeps "campaign-post" and "campaign_post" from
// silently drifting into a permanent 403.
const guard = (resource: string, operation: string) =>
  wrapWithPoliciesCheck((req, res, next) => next(), {
    resource: toSnakeCase(resource),
    operation: toSnakeCase(operation),
  })

// File zip backup có thể rất lớn — nhận qua multer diskStorage (stream thẳng
// xuống đĩa tạm, không qua bodyParser/RAM). Request JSON (restore từ file có
// sẵn trên server) không phải multipart nên multer tự bỏ qua.
const backupUpload = multer({
  dest: path.join(os.tmpdir(), "tlcv-backup-uploads"),
  limits: { fileSize: 4 * 1024 * 1024 * 1024 },
})

export default defineMiddlewares({
  routes: [
    // ── Blocked admin users (metadata.blocked) ──
    {
      matcher: "/admin",
      middlewares: [rejectBlockedAdminUser],
    },

    // ── Employees (direct user create / manage — built-in `user` policies) ──
    {
      matcher: "/admin/employees",
      method: "GET",
      middlewares: [guard("user", "read")],
    },
    {
      matcher: "/admin/employees/*",
      method: "GET",
      middlewares: [guard("user", "read")],
    },
    {
      matcher: "/admin/employees",
      method: ["POST"],
      middlewares: [guard("user", "create")],
    },
    {
      matcher: "/admin/employees/*",
      method: ["POST"],
      middlewares: [guard("user", "update")],
    },
    {
      matcher: "/admin/employees/*/password",
      method: ["POST"],
      middlewares: [guard("user", "update")],
    },
    {
      matcher: "/admin/employees/*",
      method: ["DELETE"],
      middlewares: [guard("user", "delete")],
    },

    // ── Event guards ──
    {
      matcher: "/admin/events",
      method: "GET",
      middlewares: [guard("event", "read")],
    },
    {
      matcher: "/admin/events/*",
      method: "GET",
      middlewares: [guard("event", "read")],
    },
    {
      matcher: "/admin/events",
      method: ["POST"],
      middlewares: [guard("event", "create")],
    },
    {
      matcher: "/admin/events/*",
      method: ["PATCH"],
      middlewares: [guard("event", "update")],
    },
    {
      matcher: "/admin/events/*",
      method: ["DELETE"],
      middlewares: [guard("event", "delete")],
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

    // ── Store customer auth (unchanged) ──
    {
      matcher: "/store/my-bookings*",
      middlewares: [authenticate("customer", ["bearer", "session"])],
    },

    // ── Backup guards + multer ──
    {
      matcher: "/admin/backup",
      method: "GET",
      middlewares: [guard("backup", "read")],
    },
    {
      matcher: "/admin/backup",
      method: ["POST"],
      middlewares: [guard("backup", "create")],
    },
    {
      matcher: "/admin/backup/files/*",
      method: "GET",
      middlewares: [guard("backup", "read")],
    },
    {
      matcher: "/admin/backup/files/*",
      method: ["DELETE"],
      middlewares: [guard("backup", "delete")],
    },
    {
      matcher: "/admin/backup/restore",
      method: ["POST"],
      middlewares: [guard("backup", "update"), backupUpload.single("file")],
    },

    // ── Zalo webhook (raw body, no RBAC — not admin) ──
    {
      matcher: "/webhooks/zalo/*",
      method: ["POST"],
      bodyParser: { preserveRawBody: true },
    },

    // ── Campaign-post guards ──
    {
      matcher: "/admin/campaign-posts",
      method: "GET",
      middlewares: [guard("campaign-post", "read")],
    },
    {
      matcher: "/admin/campaign-posts/*",
      method: "GET",
      middlewares: [guard("campaign-post", "read")],
    },
    {
      matcher: "/admin/campaign-posts",
      method: ["POST"],
      middlewares: [guard("campaign-post", "create")],
    },
    {
      matcher: "/admin/campaign-posts/*/duplicate",
      method: ["POST"],
      middlewares: [guard("campaign-post", "create")],
    },
    {
      matcher: "/admin/campaign-posts/*",
      method: ["PATCH"],
      middlewares: [guard("campaign-post", "update")],
    },
    {
      matcher: "/admin/campaign-posts/*",
      method: ["DELETE"],
      middlewares: [guard("campaign-post", "delete")],
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

    // ── Campaign-topic guards ──
    {
      matcher: "/admin/campaign-topics",
      method: "GET",
      middlewares: [guard("campaign-topic", "read")],
    },
    {
      matcher: "/admin/campaign-topics/*",
      method: "GET",
      middlewares: [guard("campaign-topic", "read")],
    },
    {
      matcher: "/admin/campaign-topics",
      method: ["POST"],
      middlewares: [guard("campaign-topic", "create")],
    },
    {
      matcher: "/admin/campaign-topics/*",
      method: ["PATCH"],
      middlewares: [guard("campaign-topic", "update")],
    },
    {
      matcher: "/admin/campaign-topics/*",
      method: ["DELETE"],
      middlewares: [guard("campaign-topic", "delete")],
    },

    // ── Card guards ──
    {
      matcher: "/admin/cards",
      method: "GET",
      middlewares: [guard("card", "read")],
    },
    {
      matcher: "/admin/cards/bulk-delete",
      method: ["POST"],
      middlewares: [guard("card", "delete")],
    },
    {
      matcher: "/admin/cards/import",
      method: ["POST"],
      middlewares: [guard("card", "create")],
    },
    {
      matcher: "/admin/cards/media",
      method: ["GET"],
      middlewares: [guard("card", "read")],
    },
    {
      matcher: "/admin/cards/media",
      method: ["POST"],
      middlewares: [guard("card", "update")],
    },
    {
      matcher: "/admin/cards/reorder",
      method: ["POST"],
      middlewares: [guard("card", "update")],
    },
    {
      matcher: "/admin/cards/*",
      method: "GET",
      middlewares: [guard("card", "read")],
    },
    {
      matcher: "/admin/cards",
      method: ["POST"],
      middlewares: [guard("card", "create")],
    },
    {
      matcher: "/admin/cards/*",
      method: ["PATCH"],
      middlewares: [guard("card", "update")],
    },
    {
      matcher: "/admin/cards/*",
      method: ["DELETE"],
      middlewares: [guard("card", "delete")],
    },

    // ── Event-registration guards ──
    {
      matcher: "/admin/event-registrations",
      method: "GET",
      middlewares: [guard("event-registration", "read")],
    },
    {
      matcher: "/admin/event-registrations/*",
      method: "GET",
      middlewares: [guard("event-registration", "read")],
    },
    {
      matcher: "/admin/event-registrations/*",
      method: ["PATCH"],
      middlewares: [guard("event-registration", "update")],
    },
    {
      matcher: "/admin/event-registrations/*",
      method: ["DELETE"],
      middlewares: [guard("event-registration", "delete")],
    },

    // ── Inquiry guards ──
    {
      matcher: "/admin/inquiries",
      method: "GET",
      middlewares: [guard("inquiry", "read")],
    },
    {
      matcher: "/admin/inquiries/stats",
      method: "GET",
      middlewares: [guard("inquiry", "read")],
    },
    {
      matcher: "/admin/inquiries/*",
      method: "GET",
      middlewares: [guard("inquiry", "read")],
    },
    {
      matcher: "/admin/inquiries/*",
      method: ["PATCH"],
      middlewares: [guard("inquiry", "update")],
    },

    // ── Media guards (folder routes first for matching priority) ──
    {
      matcher: "/admin/media/folders",
      method: "GET",
      middlewares: [guard("media", "read")],
    },
    {
      matcher: "/admin/media/folders",
      method: ["POST"],
      middlewares: [guard("media", "create")],
    },
    {
      matcher: "/admin/media/folders/*",
      method: ["PATCH"],
      middlewares: [guard("media", "update")],
    },
    {
      matcher: "/admin/media/folders/*",
      method: ["DELETE"],
      middlewares: [guard("media", "delete")],
    },
    {
      matcher: "/admin/media",
      method: "GET",
      middlewares: [guard("media", "read")],
    },
    {
      matcher: "/admin/media",
      method: ["POST"],
      middlewares: [guard("media", "create")],
    },
    {
      matcher: "/admin/media/*",
      method: "GET",
      middlewares: [guard("media", "read")],
    },
    {
      matcher: "/admin/media/*",
      method: ["PATCH"],
      middlewares: [guard("media", "update")],
    },
    {
      matcher: "/admin/media/*",
      method: ["DELETE"],
      middlewares: [guard("media", "delete")],
    },

    // ── Navigation guards (TLCV-only) ──
    {
      matcher: "/admin/navigation-menus",
      method: "GET",
      middlewares: [guard("navigation", "read")],
    },
    {
      matcher: "/admin/navigation-menus/*",
      method: "GET",
      middlewares: [guard("navigation", "read")],
    },
    {
      matcher: "/admin/navigation-menus",
      method: ["POST"],
      middlewares: [guard("navigation", "create")],
    },
    {
      matcher: "/admin/navigation-menus/*",
      method: ["POST"],
      middlewares: [guard("navigation", "update")],
    },
    {
      matcher: "/admin/navigation-menus/*/activate",
      method: ["POST"],
      middlewares: [guard("navigation", "update")],
    },
    {
      matcher: "/admin/navigation-menus/*",
      method: ["DELETE"],
      middlewares: [guard("navigation", "delete")],
    },
    {
      matcher: "/admin/navigations",
      method: "GET",
      middlewares: [guard("navigation", "read")],
    },
    {
      matcher: "/admin/navigations/*",
      method: "GET",
      middlewares: [guard("navigation", "read")],
    },
    {
      matcher: "/admin/navigations",
      method: ["POST"],
      middlewares: [guard("navigation", "create")],
    },
    {
      matcher: "/admin/navigations/reorder",
      method: ["POST"],
      middlewares: [guard("navigation", "update")],
    },
    {
      matcher: "/admin/navigations/*",
      method: ["PUT", "PATCH"],
      middlewares: [guard("navigation", "update")],
    },
    {
      matcher: "/admin/navigations/*",
      method: ["DELETE"],
      middlewares: [guard("navigation", "delete")],
    },

    // ── Care-channel guards (TLCV-only) ──
    {
      matcher: "/admin/care-channels",
      method: "GET",
      middlewares: [guard("care-channel", "read")],
    },
    {
      matcher: "/admin/care-channels/*",
      method: "GET",
      middlewares: [guard("care-channel", "read")],
    },
    {
      matcher: "/admin/care-channels",
      method: ["POST"],
      middlewares: [guard("care-channel", "create")],
    },
    {
      matcher: "/admin/care-channels/*",
      method: ["PATCH"],
      middlewares: [guard("care-channel", "update")],
    },
    {
      matcher: "/admin/care-channels/*/webhook",
      method: ["POST"],
      middlewares: [guard("care-channel", "update")],
    },
    {
      matcher: "/admin/care-channels/*/test",
      method: ["POST"],
      middlewares: [guard("care-channel", "update")],
    },
    {
      matcher: "/admin/care-channels/*",
      method: ["DELETE"],
      middlewares: [guard("care-channel", "delete")],
    },

    // ── Care-message guards (TLCV-only) ──
    {
      matcher: "/admin/care-messages",
      method: "GET",
      middlewares: [guard("care-message", "read")],
    },
    {
      matcher: "/admin/care-messages",
      method: ["POST"],
      middlewares: [guard("care-message", "create")],
    },

    // ── Site-settings guards (TLCV-only) ──
    {
      matcher: "/admin/site-settings",
      method: "GET",
      middlewares: [guard("site-settings", "read")],
    },
    {
      matcher: "/admin/site-settings",
      method: ["POST"],
      middlewares: [guard("site-settings", "update")],
    },
    {
      matcher: "/admin/site-settings",
      method: ["POST"],
      bodyParser: { sizeLimit: "10mb" },
    },

    // ── Product duplicate (custom route on built-in product resource) ──
    {
      matcher: "/admin/products/*/duplicate",
      method: ["POST"],
      middlewares: [guard("product", "create")],
    },
  ],
})
