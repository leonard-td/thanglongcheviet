import Medusa from "@medusajs/js-sdk"

const authType = __AUTH_TYPE__ ?? "session"
const jwtTokenStorageKey = __JWT_TOKEN_STORAGE_KEY__ || undefined
export const sdk = new Medusa({
  baseUrl: "",
  debug: import.meta.env.DEV,
  auth: {
    type: authType,
    jwtTokenStorageKey,
  },
})
