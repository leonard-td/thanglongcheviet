import Medusa from "@medusajs/js-sdk"

// Empty baseUrl makes the SDK use window.location.origin (see @medusajs/js-sdk's
// getBaseUrl) — the admin dashboard is always same-origin behind nginx
// (/app -> this backend), so it works for whichever domain served it instead
// of one MEDUSA_BACKEND_URL baked in at build time.
export const sdk = new Medusa({
  baseUrl: "",
  debug: process.env.NODE_ENV === "development",
  auth: {
    type: "session",
  },
})
