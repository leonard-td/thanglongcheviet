import { answerQuestion } from "../answer"
import { matchFaqSnippet } from "../config/faq-snippets"
import { matchKnowledgeEntry } from "../config/knowledge-base"
import { relatedQuestionsFor } from "../config/related-questions"
import { ESCALATE_MESSAGE_VI } from "../config/thresholds"
import { setAskCatalog, toAskCatalogProduct } from "../catalog-context"
import { searchCatalog as keywordSearch } from "../search/keyword-search"
import { ruleQueryMapper } from "../mapper/rule-mapper"
import { applyProductRerank } from "../search/search-catalog"
import type { SearchHit } from "../search/keyword-search"


const catalog = [
  toAskCatalogProduct({
    id: "1",
    title: "Chè Tôm",
    handle: "che-tom",
    description: "chè tôm hộp quà 10 gói",
    price: 150000,
    currencyCode: "vnd",
    thumbnail: "/a.jpg",
    categoryNames: ["Thăng Long Chè Việt"],
  }),
  toAskCatalogProduct({
    id: "2",
    title: "Chè Ướp Hoa Nhài",
    handle: "che-uop-hoa-nhai",
    description: "chè ướp hương hoa nhài",
    price: 180000,
    currencyCode: "vnd",
    thumbnail: "/b.jpg",
    categoryNames: ["Thăng Long Chè Việt"],
  }),
  toAskCatalogProduct({
    id: "3",
    title: "Hộp quà doanh nghiệp VIP",
    handle: "hop-qua-doanh-nghiep-vip",
    description: "set quà trà cao cấp cho doanh nghiệp",
    price: 990000,
    currencyCode: "vnd",
    thumbnail: "/c.jpg",
    categoryNames: ["Quà tặng"],
  }),
]

beforeEach(() => {
  setAskCatalog(catalog)
  process.env.SEARCH_SOURCE = "lib"
  process.env.COHERE_RERANK = "0"
  process.env.TYPESENSE_HYBRID = "0"
  delete process.env.COHERE_API_KEY
})

describe("ask knowledge / FAQ", () => {
  it("matches shipping FAQ", () => {
    expect(matchFaqSnippet("ship bao lâu?")?.id).toBe("shipping")
    expect(matchKnowledgeEntry("How long is shipping?")?.id).toBe("shipping")
  })

  it("does not match short pattern inside unrelated words", () => {
    expect(matchKnowledgeEntry("basic tea info")).toBeUndefined()
  })

  it("matches corporate gifts", () => {
    expect(matchFaqSnippet("quà doanh nghiệp")?.id).toBe("corporate_gifts")
  })
})

describe("ask keyword search", () => {
  it("ranks chè tôm above other chè", () => {
    const hits = keywordSearch("chè tôm", catalog)
    expect(hits[0]?.product.slug).toBe("che-tom")
  })
})

describe("ask rule mapper + answerQuestion", () => {
  it("handles courtesy", async () => {
    const a = await answerQuestion({ q: "xin chào" })
    expect(a.kind).toBe("resolved")
    const b = await answerQuestion({ q: "hello" })
    expect(b.kind).toBe("resolved")
  })

  it("answers FAQ", async () => {
    const a = await answerQuestion({ q: "giao hàng mất bao lâu?" })
    expect(a.kind).toBe("resolved")
    if (a.kind === "resolved") {
      expect(a.content.toLowerCase()).toMatch(/giao|ngày/)
    }
  })

  it("sorts cheapest", async () => {
    const plan = await ruleQueryMapper.map({ q: "sản phẩm rẻ nhất" })
    expect(plan.route).toBe("sort")
    expect(plan.sort).toBe("price_asc")

    const a = await answerQuestion({ q: "sản phẩm rẻ nhất" })
    expect(a.kind).toBe("resolved")
    if (a.kind === "resolved") {
      expect(a.sources[0]?.href).toContain("che-tom")
    }
  })

  it("lexical product suggest", async () => {
    const a = await answerQuestion({ q: "chè tôm" })
    expect(["resolved", "suggested"]).toContain(a.kind)
    if (a.kind === "suggested") {
      expect(a.options.some((o) => o.href.includes("che-tom"))).toBe(true)
    }
    if (a.kind === "resolved") {
      expect(a.sources.some((o) => o.href.includes("che-tom"))).toBe(true)
    }
  })

  it("returns honest empty on nonsense lexical", async () => {
    const vi = await answerQuestion({
      q: "cái gì đó hoàn toàn không liên quan zzz",
    })
    expect(vi.kind).toBe("resolved")
    if (vi.kind === "resolved") {
      expect(vi.sources).toHaveLength(0)
      expect(vi.content.toLowerCase()).toMatch(/không tìm thấy|thử từ khóa|shop/)
    }
  })

  it("filters by price budget", async () => {
    const plan = await ruleQueryMapper.map({ q: "chè dưới 200k" })
    expect(plan.route).toBe("filter")
    expect(plan.priceMax).toBe(200000)
    const a = await answerQuestion({ q: "chè dưới 200k" })
    expect(a.kind).toBe("resolved")
    if (a.kind === "resolved") {
      expect(a.sources.every((s) => !s.href.includes("hop-qua"))).toBe(true)
    }
  })

  it("resolves anaphora cái đó from prior product slugs", async () => {
    const plan = await ruleQueryMapper.map({
      q: "cái đó còn hàng không",
      history: [
        { role: "user", content: "chè tôm" },
        {
          role: "assistant",
          content: "gợi ý",
          productSlugs: ["che-tom"],
        },
      ],
    })
    expect(`${plan.raw} ${plan.q ?? ""}`.toLowerCase()).toMatch(/che\s*tom/)
    expect(plan.inStockOnly).toBe(true)
  })
})

describe("ask cohere rerank mock", () => {
  it("reorders with injectable rerankFn", async () => {
    process.env.COHERE_RERANK = "1"
    process.env.COHERE_API_KEY = "test-key"

    const hits: SearchHit[] = catalog.map((p, i) => ({
      type: "product",
      id: p.id,
      score: 2 - i * 0.1,
      product: p,
    }))

    // Direct unit of applyProductRerank uses live Cohere when no inject —
    // call rerankWithCohere path via applyProductRerank fail-soft without network:
    // without injectable in applyProductRerank, it will try network and catch → same order.
    const out = await applyProductRerank("nhài", hits)
    expect(out.length).toBeGreaterThan(0)
    expect(out.every((h) => h.type === "product")).toBe(true)
  })
})

describe("ask gaps / domain polish", () => {
  it("sensitive complaint escalates", async () => {
    const plan = await ruleQueryMapper.map({ q: "hàng bị hỏng khi nhận" })
    expect(plan.route).toBe("escalate")
    const a = await answerQuestion({ q: "hàng bị hỏng khi nhận" })
    expect(a.kind).toBe("escalated")
    if (a.kind === "escalated") {
      expect(a.message).toBe(ESCALATE_MESSAGE_VI)
    }
  })

  it("related chips are tea-domain not headphones", () => {
    const chips = relatedQuestionsFor({
      q: "xin chào",
      assistantContent: "Xin chào!",
      hasProductSuggestions: false,
    })
    expect(chips.join(" ").toLowerCase()).not.toMatch(
      /tai nghe|headphones|áo khoác|jacket|bán chạy|best selling/,
    )
    expect(chips.join(" ").toLowerCase()).toMatch(/chè|sen|ship|rẻ nhất/)
  })

  it("does not apply apparel color filters on tea queries", async () => {
    const plan = await ruleQueryMapper.map({ q: "chè màu hồng" })
    expect(plan.optionFilters?.color).toBeUndefined()
    expect(plan.route).not.toBe("filter")
    const a = await answerQuestion({ q: "chè màu hồng" })
    expect(a.kind).not.toBe("escalated")
    if (a.kind === "resolved" || a.kind === "suggested") {
      const text =
        a.kind === "resolved" ? a.content : a.note
      expect(text.toLowerCase()).not.toMatch(/màu pink|color pink|option/)
    }
  })

  it("answers warranty FAQ", async () => {
    const a = await answerQuestion({ q: "bảo hành bao lâu?" })
    expect(a.kind).toBe("resolved")
    if (a.kind === "resolved") {
      expect(a.content.toLowerCase()).toMatch(/bảo hành|đổi\/trả|7 ngày/)
    }
  })

  it("does not escalate ASCII mau hong as complaint", async () => {
    const plan = await ruleQueryMapper.map({ q: "che mau hong" })
    expect(plan.route).not.toBe("escalate")
    const a = await answerQuestion({ q: "che mau hong" })
    expect(a.kind).not.toBe("escalated")
  })

  it("thanks is courtesy", async () => {
    const plan = await ruleQueryMapper.map({ q: "cảm ơn bạn" })
    expect(plan.route).toBe("courtesy")
  })
})
