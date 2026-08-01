import { useQuery } from "@tanstack/react-query"
import { useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"
import {
  SIDEBAR_BADGE_SECTIONS,
  fetchAllBadgeCounts,
  findSidebarNavLink,
  isBadgeMutation,
  paintSidebarBadge,
  setSeenCount,
  unreadCount,
} from "../../lib/sidebar-badges"

type PaintState = {
  counts: Record<string, number>
  pathname: string
}

let paintScheduled = false
let observer: MutationObserver | null = null
let observerRefCount = 0
let latestPaintState: PaintState | null = null

function runPaint(state: PaintState) {
  for (const section of SIDEBAR_BADGE_SECTIONS) {
    const link = findSidebarNavLink(section.path)
    if (!link) continue

    const onPage =
      state.pathname === section.path ||
      state.pathname.startsWith(`${section.path}/`)
    const current = state.counts[section.id] ?? 0
    const unread = onPage ? 0 : unreadCount(section.id, current)
    paintSidebarBadge(link, unread)
  }
}

function schedulePaint(state: PaintState) {
  latestPaintState = state
  if (paintScheduled) return
  paintScheduled = true

  requestAnimationFrame(() => {
    paintScheduled = false
    if (latestPaintState) {
      runPaint(latestPaintState)
    }
  })
}

function ensureObserver() {
  if (typeof document === "undefined" || observer) return

  observer = new MutationObserver((mutations) => {
    if (!latestPaintState) return
    if (mutations.every(isBadgeMutation)) return
    schedulePaint(latestPaintState)
  })

  const sidebar = document.querySelector("aside") ?? document.body
  observer.observe(sidebar, { childList: true, subtree: true })
}

function retainObserver() {
  observerRefCount += 1
  ensureObserver()
}

function releaseObserver() {
  observerRefCount = Math.max(0, observerRefCount - 1)
  if (observerRefCount === 0 && observer) {
    observer.disconnect()
    observer = null
  }
}

/**
 * Polls pending counts for extension menu items and paints small numeric badges
 * on matching sidebar links. Visiting a section clears its badge until new
 * items arrive (count rises above the last seen total).
 */
const SidebarBadges = () => {
  const location = useLocation()
  const countsRef = useRef<Record<string, number>>({})

  const { data: counts = {} } = useQuery({
    queryKey: ["sidebar-badge-counts"],
    queryFn: fetchAllBadgeCounts,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  })

  countsRef.current = counts

  useEffect(() => {
    retainObserver()
    return () => releaseObserver()
  }, [])

  useEffect(() => {
    for (const section of SIDEBAR_BADGE_SECTIONS) {
      if (
        location.pathname === section.path ||
        location.pathname.startsWith(`${section.path}/`)
      ) {
        const current = countsRef.current[section.id] ?? 0
        setSeenCount(section.id, current)
      }
    }
  }, [location.pathname, counts])

  useEffect(() => {
    schedulePaint({ counts, pathname: location.pathname })
  }, [counts, location.pathname])

  return null
}

export default SidebarBadges
