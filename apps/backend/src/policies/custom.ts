import { definePolicies } from "@medusajs/framework/utils"

/**
 * Helper to declare CRUD policies for a resource.
 * Returns the exported definePolicies result for framework registration.
 */
function declareResourcePolicies(
  resource: string,
  label: string,
  operations: string[] = ["read", "create", "update", "delete"],
) {
  return definePolicies(
    operations.map((op) => ({
      name: `${op.charAt(0).toUpperCase() + op.slice(1)} ${label}`,
      resource,
      operation: op,
    })),
  )
}

// Campaign module
export const campaignPostPolicies = declareResourcePolicies(
  "campaign-post",
  "Campaign Posts",
)
export const campaignTopicPolicies = declareResourcePolicies(
  "campaign-topic",
  "Campaign Topics",
)

// Card module
export const cardPolicies = declareResourcePolicies("card", "Cards")

// Event module
export const eventPolicies = declareResourcePolicies("event", "Events")
export const eventRegistrationPolicies = declareResourcePolicies(
  "event-registration",
  "Event Registrations",
  ["read", "update", "delete"],
)

// Inquiry module
export const inquiryPolicies = declareResourcePolicies("inquiry", "Inquiries", [
  "read",
  "update",
])

// Media
export const mediaPolicies = declareResourcePolicies("media", "Media")

// TLCV-only modules
export const navigationPolicies = declareResourcePolicies(
  "navigation",
  "Navigations",
)
export const careChannelPolicies = declareResourcePolicies(
  "care-channel",
  "Care Channels",
)
export const careMessagePolicies = declareResourcePolicies(
  "care-message",
  "Care Messages",
  ["read", "create"],
)
export const siteSettingsPolicies = declareResourcePolicies(
  "site-settings",
  "Site Settings",
  ["read", "update"],
)
export const backupPolicies = declareResourcePolicies("backup", "Backups")
