import { sdk } from "./sdk"

/** Extension sidebar sections that expose a countable "needs attention" total. */
export type SidebarBadgeSection = {
  id: string
  /** Admin route path segment, e.g. `/inquiries`. */
  path: string
  fetchCount: () => Promise<number>
}

const STORAGE_PREFIX = "tlcv-admin-badge-seen:"

export const SIDEBAR_BADGE_SECTIONS: SidebarBadgeSection[] = [
  {
    id: "inquiries",
    path: "/inquiries",
    fetchCount: async () => {
      const res = await sdk.client.fetch<{ count: number }>("/admin/inquiries", {
        query: { status: "new", limit: 1, offset: 0 },
      })
      return res.count ?? 0
    },
  },
  {
    id: "event-registrations",
    path: "/event-registrations",
    fetchCount: async () => {
      const res = await sdk.client.fetch<{ count: number }>(
        "/admin/event-registrations",
        { query: { status: "new", limit: 1, offset: 0 } },
      )
      return res.count ?? 0
    },
  },
  {
    id: "care-messages",
    path: "/care-messages",
    fetchCount: async () => {
      const res = await sdk.client.fetch<{ count: number }>("/admin/care-messages", {
        query: { status: "failed", limit: 1, offset: 0 },
      })
      return res.count ?? 0
    },
  },
]

export function getSeenCount(sectionId: string): number {
  if (typeof window === "undefined") return 0
  const raw = localStorage.getItem(`${STORAGE_PREFIX}${sectionId}`)
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

export function setSeenCount(sectionId: string, count: number): void {
  if (typeof window === "undefined") return
  localStorage.setItem(`${STORAGE_PREFIX}${sectionId}`, String(count))
}

export function unreadCount(sectionId: string, currentCount: number): number {
  return Math.max(0, currentCount - getSeenCount(sectionId))
}

export async function fetchAllBadgeCounts(): Promise<Record<string, number>> {
  const entries = await Promise.all(
    SIDEBAR_BADGE_SECTIONS.map(async (section) => {
      try {
        const count = await section.fetchCount()
        return [section.id, count] as const
      } catch {
        return [section.id, 0] as const
      }
    }),
  )
  return Object.fromEntries(entries)
}

export function findSidebarNavLink(path: string): HTMLElement | null {
  if (typeof document === "undefined") return null

  for (const anchor of document.querySelectorAll("a[href]")) {
    const href = anchor.getAttribute("href") ?? ""
    if (href === path || href.endsWith(path)) {
      return anchor as HTMLElement
    }
  }
  return null
}

const STYLE_ID = "tlcv-sidebar-badge-styles"

export function ensureBadgeStyles(): void {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return

  const style = document.createElement("style")
  style.id = STYLE_ID
  style.textContent = `
    a.tlcv-nav-badge-host {
      position: relative;
    }
    .tlcv-sidebar-badge {
      position: absolute;
      top: -2px;
      right: -2px;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      border-radius: 9999px;
      background: #ef4444;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      line-height: 16px;
      text-align: center;
      pointer-events: none;
      z-index: 2;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.15);
    }
  `
  document.head.appendChild(style)
}

function formatBadgeCount(count: number): string {
  return count > 99 ? "99+" : String(count)
}

/** Skip DOM writes when unchanged — avoids MutationObserver feedback loops. */
export function paintSidebarBadge(link: HTMLElement, count: number): void {
  ensureBadgeStyles()

  const badge = link.querySelector(".tlcv-sidebar-badge") as HTMLElement | null
  const label = count > 0 ? formatBadgeCount(count) : ""

  if (count <= 0) {
    if (!badge) {
      link.classList.remove("tlcv-nav-badge-host")
      return
    }
    badge.remove()
    link.classList.remove("tlcv-nav-badge-host")
    return
  }

  link.classList.add("tlcv-nav-badge-host")

  if (badge && badge.textContent === label) {
    return
  }

  const el = badge ?? document.createElement("span")
  if (!badge) {
    el.className = "tlcv-sidebar-badge"
    el.setAttribute("aria-hidden", "true")
    link.appendChild(el)
  }
  el.textContent = label
}

/** Returns true if the mutation was caused by our own badge elements. */
export function isBadgeMutation(mutation: MutationRecord): boolean {
  const nodes = [...mutation.addedNodes, ...mutation.removedNodes]
  for (const node of nodes) {
    if (!(node instanceof HTMLElement)) continue
    if (
      node.classList.contains("tlcv-sidebar-badge") ||
      node.querySelector?.(".tlcv-sidebar-badge")
    ) {
      return true
    }
  }
  return false
}
