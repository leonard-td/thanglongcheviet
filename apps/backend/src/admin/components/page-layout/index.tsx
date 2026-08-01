import { Container, clx } from "@medusajs/ui"
import type { ReactNode } from "react"
import LanguageSwitcher from "../language-switcher"
import SidebarBadges from "../sidebar-badges"

/**
 * Layout chung cho mọi trang CUSTOM ROUTE của admin (cards, campaign-posts,
 * media...).
 *
 * Medusa Admin không hỗ trợ file layout cho custom route, nên các phần dùng
 * chung được gom vào component này:
 * - `Container` với style chuẩn `divide-y p-0` (thống nhất giữa các trang)
 * - `LanguageSwitcher`: widget zone không chạy trên custom route, nên nút
 *   chuyển ngôn ngữ phải được mount từ trong trang — layout này lo việc đó,
 *   các page không cần nhớ tự thêm.
 */
type PageLayoutProps = {
  children: ReactNode
  className?: string
}

const PageLayout = ({ children, className }: PageLayoutProps) => (
  <Container className={clx("divide-y p-0", className)}>
    <LanguageSwitcher />
    <SidebarBadges />
    {children}
  </Container>
)

export default PageLayout
