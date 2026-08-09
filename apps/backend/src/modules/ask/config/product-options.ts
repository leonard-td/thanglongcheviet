/**
 * Closed allowlist of product SKU option values (Ask attribute-first).
 * TLCV tea catalog does not use Color/Size SKU options — see ASK_OPTION_FILTERS_ENABLED
 * in option-grammar.ts (extract is no-op). Allowlist kept for future re-enable.
 */

export type OptionFilters = {
  size?: string
  color?: string
}

export const PRODUCT_OPTION_COLORS = [
  'black',
  'white',
  'pink',
  'red',
  'blue',
  'green',
  'yellow',
  'gray',
  'beige',
  'brown',
  'navy',
] as const

export const PRODUCT_OPTION_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const

export type ProductOptionColor = (typeof PRODUCT_OPTION_COLORS)[number]
export type ProductOptionSize = (typeof PRODUCT_OPTION_SIZES)[number]

const COLOR_SET = new Set<string>(PRODUCT_OPTION_COLORS)
const SIZE_SET = new Set<string>(PRODUCT_OPTION_SIZES)

/**
 * Closed VI/EN → English catalog color. Unknown tokens are not passed through
 * (Ask quality = allowlist + seed, not open-ended aliases).
 */
const COLOR_NORMALIZE: Record<string, ProductOptionColor> = {
  black: 'black',
  đen: 'black',
  den: 'black',
  white: 'white',
  trắng: 'white',
  trang: 'white',
  pink: 'pink',
  hồng: 'pink',
  hong: 'pink',
  red: 'red',
  đỏ: 'red',
  do: 'red',
  blue: 'blue',
  'xanh dương': 'blue',
  'xanh duong': 'blue',
  green: 'green',
  'xanh lá': 'green',
  'xanh la': 'green',
  yellow: 'yellow',
  vàng: 'yellow',
  vang: 'yellow',
  gray: 'gray',
  grey: 'gray',
  xám: 'gray',
  xam: 'gray',
  beige: 'beige',
  be: 'beige',
  nâu: 'brown',
  nau: 'brown',
  brown: 'brown',
  navy: 'navy',
}

/** Normalize free-text / indexed color to allowlisted English, or undefined if unknown. */
export function normalizeColorValue(raw: string): ProductOptionColor | undefined {
  const key = raw.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!key) return undefined
  const mapped = COLOR_NORMALIZE[key]
  if (mapped) return mapped
  if (COLOR_SET.has(key)) return key as ProductOptionColor
  return undefined
}

/** Normalize size token to allowlisted uppercase, or undefined if unknown. */
export function normalizeSizeValue(raw: string): ProductOptionSize | undefined {
  const key = raw.trim().toUpperCase()
  if (!key) return undefined
  if (SIZE_SET.has(key)) return key as ProductOptionSize
  return undefined
}

/** Validate LLM/rule optionFilters bag against allowlist (drop unknown). */
export function sanitizePlanOptions(raw: unknown): OptionFilters | undefined {
  // TLCV: never emit Color/Size filters (tea catalog has no such options).
  void raw
  return undefined
}
