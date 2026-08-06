import { useQuery } from "@tanstack/react-query"
import { useEffect } from "react"
import { sdk } from "../lib/sdk"
import type { InquiryStatsResponse } from "../types/inquiry"

const BADGE_ATTR = "data-tlcv-inquiries-badge"
const POLL_MS = 30_000
const RESYNC_MS = 5_000

export const INQUIRIES_STATS_QUERY_KEY = ["inquiries", "stats"] as const

export function useInquiriesNewCount(enabled = true) {
  return useQuery<InquiryStatsResponse>({
    queryKey: INQUIRIES_STATS_QUERY_KEY,
    queryFn: () => sdk.client.fetch("/admin/inquiries/stats"),
    enabled,
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
  })
}

function renderBadge(link: HTMLAnchorElement, count: number) {
  link.style.position = "relative"

  let badge = link.querySelector<HTMLElement>(`[${BADGE_ATTR}]`)
  if (!badge) {
    badge = document.createElement("span")
    badge.setAttribute(BADGE_ATTR, "true")
    badge.className =
      "pointer-events-none absolute end-1 top-1/2 z-10 flex min-h-[18px] min-w-[18px] -translate-y-1/2 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white shadow-sm"
    link.appendChild(badge)
  }

  const nextText = count > 99 ? "99+" : String(count)
  const nextDisplay = count <= 0 ? "none" : "flex"

  if (badge.style.display === nextDisplay && badge.textContent === nextText) {
    return
  }

  badge.style.display = nextDisplay
  if (count <= 0) {
    return
  }

  badge.textContent = nextText
  badge.title = `${count} new`
}

function syncSidebarBadges(count: number) {
  const links = document.querySelectorAll<HTMLAnchorElement>(
    'a[href="/inquiries"], a[href$="/inquiries"]'
  )

  links.forEach((link) => {
    renderBadge(link, count)
  })
}

/**
 * Polls /admin/inquiries/stats and paints a red count badge on the sidebar
 * "Customer Inquiries" item. Medusa's defineRouteConfig has no native badge
 * slot, so we attach to the nav link by href.
 *
 * Avoid MutationObserver here — mutating the sidebar DOM inside an observer
 * callback causes an infinite loop and freezes the admin UI.
 */
export function useInquiriesNavBadge(count: number) {
  useEffect(() => {
    syncSidebarBadges(count)

    const interval = window.setInterval(() => {
      syncSidebarBadges(count)
    }, RESYNC_MS)

    return () => {
      window.clearInterval(interval)
      document
        .querySelectorAll<HTMLElement>(`[${BADGE_ATTR}]`)
        .forEach((el) => el.remove())
    }
  }, [count])
}
