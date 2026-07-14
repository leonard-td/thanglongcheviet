import { Heading, Text } from "@medusajs/ui"
import type { ReactNode } from "react"

type PageHeaderProps = {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
}

/**
 * Page header for custom admin routes. Sticks to the top of the admin's
 * scroll container so the primary actions (Save, Delete, …) stay reachable
 * while long edit forms scroll underneath.
 */
const PageHeader = ({ title, subtitle, actions }: PageHeaderProps) => (
  <div className="sticky top-0 z-30 flex items-center justify-between gap-4 rounded-t-lg bg-ui-bg-base px-6 py-4">
    <div className="min-w-0">
      <Heading level="h1">{title}</Heading>
      {subtitle ? (
        <Text className="text-ui-fg-subtle truncate" size="small">
          {subtitle}
        </Text>
      ) : null}
    </div>
    {actions ? (
      <div className="flex flex-shrink-0 items-center gap-x-2">{actions}</div>
    ) : null}
  </div>
)

export default PageHeader
