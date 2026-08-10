/**
 * Product option name helpers + thin rule-fallback extract (docs/24).
 * Canonical color/size values live in `product-options.ts` (Ask allowlist SoT).
 *
 * TLCV tea catalog has no Color/Size SKU options — apparel grammar is disabled
 * so queries like “chè màu hồng” stay lexical (not empty option filters).
 */

import {
  normalizeColorValue,
  normalizeSizeValue,
  type OptionFilters,
} from './product-options'

export type { OptionFilters }

export { normalizeColorValue, normalizeSizeValue }

const SIZE_OPTION_NAMES = /^(size|sizes|kích\s*thước|kich\s*thuoc|cỡ|co)$/i
const COLOR_OPTION_NAMES = /^(color|colour|colors|màu|mau)$/i

/** TLCV: Color/Size option NLU off (no apparel SKUs). */
export const ASK_OPTION_FILTERS_ENABLED = false

/**
 * CI / no-API-key fallback only. Emits allowlisted values via sanitizePlanOptions.
 * Disabled for TLCV — returns {}.
 */
export function extractOptionFilters(_s: string): OptionFilters {
  if (!ASK_OPTION_FILTERS_ENABLED) return {}
  // Apparel extract kept for future re-enable; unreachable while flag is false.
  return {}
}

export function isSizeOptionName(name: string): boolean {
  return SIZE_OPTION_NAMES.test(name.trim())
}

export function isColorOptionName(name: string): boolean {
  return COLOR_OPTION_NAMES.test(name.trim())
}
