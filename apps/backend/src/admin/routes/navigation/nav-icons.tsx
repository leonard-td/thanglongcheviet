/**
 * Nav icon set: a small, fixed list of SVGs an admin can pick as the
 * leading visual for a navigation item's `icon` field (used when
 * `display_mode === "icon"`). Keys here MUST match the AppIconName union
 * in apps/web/components/widgets/Icon.vue exactly — that's the component
 * the storefront renders these with (GET /store/navigations just returns
 * the key as a string, the storefront maps it to an SVG).
 *
 * Add a new icon: add the key to NAV_ICON_KEYS below + an SVG branch here,
 * AND the matching branch + AppIconName entry in Icon.vue.
 */
export const NAV_ICON_KEYS = [
  "home",
  "leaf",
  "tea",
  "coffee",
  "gift",
  "calendar",
  "newspaper",
  "book",
  "users",
  "phone",
  "map-pin",
  "star",
  "tag",
  "info",
] as const

export type NavIconKey = (typeof NAV_ICON_KEYS)[number]

type NavIconProps = {
  name: string
  className?: string
}

export const NavIconPreview = ({ name, className }: NavIconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {name === "home" && (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10" />
      </>
    )}
    {name === "leaf" && (
      <path d="M11 20A7 7 0 0 1 4 13c0-4 3-9 11-11 1 6-1 11-4 15-1.5 2-3 3-3 3ZM4 13c0 3 2 5 4 6" />
    )}
    {name === "tea" && (
      <>
        <path d="M3 8h13v6a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5Z" />
        <path d="M16 9h1a3 3 0 0 1 0 6h-1" />
        <path d="M2 19h16" />
        <path d="M8 2c0 1-1 1.2-1 2.2S8 5.4 8 6.4M12 2c0 1-1 1.2-1 2.2s1 1.2 1 2.2" />
      </>
    )}
    {name === "coffee" && (
      <>
        <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
        <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
        <path d="M6 2v2M10 2v2M14 2v2" />
      </>
    )}
    {name === "gift" && (
      <>
        <rect x="3" y="8" width="18" height="4" rx="1" />
        <path d="M12 8v13M19 12v9H5v-9" />
        <path d="M12 8c-1.5-4-6-4-6-1.5S9 8 12 8Zm0 0c1.5-4 6-4 6-1.5S15 8 12 8Z" />
      </>
    )}
    {name === "calendar" && (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    )}
    {name === "newspaper" && (
      <>
        <path d="M4 4h13a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
        <path d="M9 9h7M9 13h7M9 17h4" />
      </>
    )}
    {name === "book" && (
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13ZM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-3" />
    )}
    {name === "users" && (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
        <path d="M16.5 5.2a3.5 3.5 0 0 1 0 6.6M21.5 20a6 6 0 0 0-4.5-8.4" />
      </>
    )}
    {name === "phone" && (
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" />
    )}
    {name === "map-pin" && (
      <>
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </>
    )}
    {name === "star" && (
      <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01Z" />
    )}
    {name === "tag" && (
      <>
        <path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24H4a1 1 0 0 0-1 1v5.59a2 2 0 0 0 .59 1.41l9.58 9.58a2 2 0 0 0 2.83 0l4.59-4.58a2 2 0 0 0 0-2.83Z" />
        <circle cx="7.5" cy="7.5" r="1.25" />
      </>
    )}
    {name === "info" && (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </>
    )}
  </svg>
)
