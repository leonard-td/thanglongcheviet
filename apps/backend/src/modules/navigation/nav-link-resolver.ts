/**
 * URL -> storefront entity type convention, shared by the admin nav preview
 * (src/api/utils/nav-thumbnails.ts, used by /admin/navigations*) and the
 * public /store/navigations route, so both resolve a nav item's thumbnail
 * the exact same way the storefront itself routes that URL.
 *
 * Mirrors the path prefixes already established in:
 * - apps/web/server/routes/sitemap.xml.ts (product/productCategory/
 *   productCollection/productTopic/post/postTopic/storeEvent/eventTopic)
 * - apps/backend's own `basePath` convention in
 *   src/admin/widgets/{category,collection,product}-list-links.tsx
 */
export type NavLinkType =
  | "product"
  | "product_category"
  | "product_collection"
  | "product_topic"
  | "post"
  | "post_topic"
  | "event"
  | "event_topic"

export type ParsedNavLink = {
  type: NavLinkType
  slug: string
}

// Order matters: longer/more specific prefixes must be checked before the
// generic `/san-pham/:handle`-style catch-all for the same root segment.
const ROUTE_PATTERNS: Array<{ type: NavLinkType; regex: RegExp }> = [
  { type: "product_category", regex: /^\/san-pham\/danh-muc\/([^/]+)\/?$/ },
  { type: "product_collection", regex: /^\/san-pham\/bo-suu-tap\/([^/]+)\/?$/ },
  { type: "product_topic", regex: /^\/san-pham\/chu-de\/([^/]+)\/?$/ },
  { type: "post_topic", regex: /^\/tin-tuc\/chu-de\/([^/]+)\/?$/ },
  { type: "event_topic", regex: /^\/trai-nghiem\/chu-de\/([^/]+)\/?$/ },
  { type: "post", regex: /^\/tin-tuc\/([^/]+)\/?$/ },
  { type: "event", regex: /^\/trai-nghiem\/([^/]+)\/?$/ },
  { type: "product", regex: /^\/san-pham\/([^/]+)\/?$/ },
]

/**
 * Parses a NavigationItem.url into a storefront entity reference, or null
 * for static/unrecognized pages (e.g. "/", "/gioi-thieu", "/du-an-doi-tac",
 * listing pages like "/san-pham-list" or "/tin-tuc").
 */
export function parseNavUrl(url: string | null | undefined): ParsedNavLink | null {
  if (!url) return null

  let path: string
  try {
    path = url.startsWith("http") ? new URL(url).pathname : url
  } catch {
    path = url
  }

  path = path.split("?")[0]!.split("#")[0]!
  // Storefront i18n prefixes /en for non-default locale (nuxt-i18n
  // prefix_except_default) — strip it so both locales resolve the same way.
  path = path.replace(/^\/en(?=\/|$)/, "") || "/"

  for (const { type, regex } of ROUTE_PATTERNS) {
    const match = path.match(regex)
    if (match) {
      return { type, slug: decodeURIComponent(match[1]!) }
    }
  }

  return null
}
