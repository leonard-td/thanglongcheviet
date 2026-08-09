/**
 * FAQ / policy for Thăng Long Chè Việt Ask (rule-engine).
 */

export type KnowledgeEntry = {
  id: string
  patterns: string[]
  href?: string
  sensitive?: boolean
  question?: string
  answer?: string
  answerVi?: string
}

export const knowledgeBase: KnowledgeEntry[] = [
  {
    id: "shipping",
    patterns: [
      "ship",
      "shipping",
      "delivery",
      "giao hàng",
      "giao hang",
      "phí ship",
      "phi ship",
      "vận chuyển",
      "van chuyen",
      "bao lâu nhận",
      "bao lau nhan",
      "phí giao",
      "phi giao",
    ],
    question: "How long does shipping take?",
    answer:
      "We ship nationwide. Standard delivery usually takes 2–5 business days depending on your location. You will receive tracking once the order ships.",
    answerVi:
      "Chúng tôi giao hàng toàn quốc. Thời gian giao tiêu chuẩn thường 2–5 ngày làm việc tùy địa chỉ. Bạn sẽ nhận mã theo dõi khi đơn được gửi.",
    href: "/lien-he#shipping",
  },
  {
    id: "returns",
    patterns: [
      "return",
      "refund",
      "exchange",
      "đổi trả",
      "doi tra",
      "hoàn tiền",
      "hoan tien",
      "trả hàng",
      "tra hang",
    ],
    question: "Can I return or exchange a product?",
    answer:
      "Eligible products may be exchanged or returned within 7 days if unused and in original packaging. Contact us with your order details to start a return.",
    answerVi:
      "Sản phẩm đủ điều kiện có thể đổi/trả trong 7 ngày nếu còn nguyên seal và bao bì. Liên hệ kèm thông tin đơn để được hỗ trợ.",
    href: "/lien-he#returns",
  },
  {
    id: "payment",
    patterns: [
      "pay",
      "payment",
      "checkout",
      "cod",
      "cash on delivery",
      "thanh toán",
      "thanh toan",
      "thu hộ",
      "thu ho",
      "chuyển khoản",
      "chuyen khoan",
    ],
    question: "What payment methods do you accept?",
    answer:
      "You can pay via the methods on checkout. For large corporate gift orders, bank transfer is available after quotation.",
    answerVi:
      "Bạn có thể thanh toán qua các phương thức trên trang thanh toán. Đơn quà doanh nghiệp số lượng lớn có thể chuyển khoản sau khi nhận báo giá.",
    href: "/lien-he#payment",
  },
  {
    id: "orders",
    patterns: [
      "where is my order",
      "order status",
      "track order",
      "đơn của tôi",
      "don cua toi",
      "đơn hàng",
      "don hang",
      "kiểm tra đơn",
      "kiem tra don",
      "tra cứu đơn",
      "tra cuu don",
      "theo dõi đơn",
      "theo doi don",
    ],
    question: "How do I check my order status?",
    answer:
      "Use Order lookup on the website with your phone or order email, or contact support with your order number.",
    answerVi:
      "Dùng trang Tra cứu đơn trên website với SĐT/email đặt hàng, hoặc liên hệ hỗ trợ kèm mã đơn.",
    href: "/tra-cuu-don",
  },
  {
    id: "booking",
    patterns: [
      "book now",
      "booking",
      "appointment",
      "schedule a visit",
      "book a visit",
      "đặt lịch",
      "dat lich",
      "hẹn giờ",
      "hen gio",
      "trải nghiệm",
      "trai nghiem",
    ],
    question: "How do I book a visit?",
    answer:
      "You can book a visit or experience via Book now on the site. Leave your preferred time and we will confirm.",
    answerVi:
      "Bạn có thể đặt lịch trải nghiệm qua nút Đặt lịch trên website. Để lại thời gian mong muốn, chúng tôi sẽ xác nhận lại.",
    href: "/lien-he#booking",
  },
  {
    id: "corporate_gifts",
    patterns: [
      "corporate",
      "bulk",
      "wholesale",
      "b2b",
      "quà doanh nghiệp",
      "qua doanh nghiep",
      "quà tặng doanh nghiệp",
      "qua tang doanh nghiep",
      "gia si",
      "giá sỉ",
      "báo giá",
      "bao gia",
      "in logo",
    ],
    question: "Do you offer corporate tea gifts?",
    answer:
      "We offer premium tea gift sets for corporate gifting, including packaging and logo options. Leave your company details on the Corporate gifts page or Ask escalate form for a quote.",
    answerVi:
      "Chúng tôi cung cấp set quà trà cao cấp cho doanh nghiệp, hỗ trợ bao bì và in logo. Để lại thông tin công ty trên trang Quà tặng doanh nghiệp hoặc form liên hệ trong Ask để nhận báo giá.",
    href: "/qua-tang-doanh-nghiep",
  },
  {
    id: "warranty",
    patterns: [
      "warranty",
      "guarantee",
      "bảo hành",
      "bao hanh",
      "bảo quản",
      "bao quan",
    ],
    question: "Do tea products include a warranty?",
    answer:
      "Tea products are food goods — we do not offer electronics-style warranties. If a sealed pack arrives damaged or incorrect, contact us within 7 days for exchange or refund under the return policy.",
    answerVi:
      "Trà là thực phẩm nên không có bảo hành kiểu thiết bị điện tử. Nếu nhận hàng bị hỏng seal hoặc sai sản phẩm, liên hệ trong 7 ngày để đổi/trả theo chính sách đổi trả.",
    href: "/lien-he#returns",
  },
  {
    id: "support",
    patterns: [
      "contact",
      "support",
      "help",
      "human",
      "liên hệ",
      "lien he",
      "hỗ trợ",
      "ho tro",
      "hotline",
      "cskh",
    ],
    question: "How can I contact support?",
    answer:
      "Use Ask escalate to leave your phone or email, open the Connect widget (Zalo / Facebook), or visit the Contact page. We typically reply within one business day.",
    answerVi:
      "Để lại SĐT/email trong Ask, dùng widget Kết nối (Zalo / Facebook), hoặc vào trang Liên hệ. Chúng tôi thường phản hồi trong một ngày làm việc.",
    href: "/lien-he",
  },
  {
    id: "about_tea",
    patterns: [
      "thăng long",
      "thang long",
      "chè việt",
      "che viet",
      "giới thiệu",
      "gioi thieu",
    ],
    question: "What is Thăng Long Chè Việt?",
    answer:
      "Thăng Long Chè Việt crafts Vietnamese tea gifts and cultural experiences — from scented teas to corporate gift sets.",
    answerVi:
      "Thăng Long Chè Việt chuyên trà Việt và quà tặng văn hóa — từ chè ướp hương đến set quà doanh nghiệp.",
    href: "/gioi-thieu",
  },
  {
    id: "complaint",
    patterns: [
      "broken",
      "damaged",
      "wrong item",
      "complaint",
      "bị hỏng",
      "bi hong",
      "hỏng",
      // Do not use bare ASCII "hong" — collisions with “màu hồng” → “mau hong”.
      "bị vỡ",
      "bi vo",
      "sai hàng",
      "sai hang",
      "khiếu nại",
      "khieu nai",
    ],
    sensitive: true,
  },
]

export function matchKnowledgeEntry(
  q: string,
  opts?: { requireAnswer?: boolean }
): KnowledgeEntry | undefined {
  const needle = q.trim().toLowerCase()
  if (!needle) return undefined

  let best:
    | {
        entry: KnowledgeEntry
        totalScore: number
        maxPatternLen: number
        matchCount: number
      }
    | undefined

  for (const entry of knowledgeBase) {
    if (opts?.requireAnswer && !entry.answer) continue
    let totalScore = 0
    let maxPatternLen = 0
    let matchCount = 0

    for (const pattern of entry.patterns) {
      const p = pattern.toLowerCase()
      const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const re = new RegExp(
        `(?:^|[^\\p{L}\\p{N}])${escaped}(?:[^\\p{L}\\p{N}]|$)`,
        "u"
      )
      if (!re.test(needle) && !(p.includes(" ") && needle.includes(p))) continue
      totalScore += p.length
      maxPatternLen = Math.max(maxPatternLen, p.length)
      matchCount += 1
    }

    if (matchCount === 0) continue
    if (
      !best ||
      totalScore > best.totalScore ||
      (totalScore === best.totalScore && maxPatternLen > best.maxPatternLen) ||
      (totalScore === best.totalScore &&
        maxPatternLen === best.maxPatternLen &&
        matchCount > best.matchCount)
    ) {
      best = { entry, totalScore, maxPatternLen, matchCount }
    }
  }

  return best?.entry
}
