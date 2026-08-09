import { setAskCatalog, toAskCatalogProduct } from "../catalog-context"
import { toProductDoc } from "../search/typesense/sync"
import {
  createTypesenseSearchEngine,
  mapTypesenseHitScore,
  resetTypesenseSearchEngineCache,
} from "../search/typesense/search"
import {
  getSearchEngine,
  getSearchSource,
  libSearchEngine,
} from "../search/lib-engine"
import { searchCatalogQuery } from "../search/search-catalog"
import { HIGH_THRESHOLD, MED_THRESHOLD } from "../config/thresholds"

const catalog = [
  toAskCatalogProduct({
    id: "p1",
    title: "Chè Tôm",
    handle: "che-tom",
    description: "chè tôm hộp quà",
    price: 150000,
    currencyCode: "vnd",
    categoryNames: ["Trà"],
  }),
  toAskCatalogProduct({
    id: "p2",
    title: "Chè Nhài",
    handle: "che-nhai",
    description: "chè ướp hoa nhài",
    price: 180000,
    currencyCode: "vnd",
    categoryNames: ["Trà"],
  }),
]

beforeEach(() => {
  setAskCatalog(catalog)
  resetTypesenseSearchEngineCache()
  process.env.SEARCH_SOURCE = "lib"
  process.env.TYPESENSE_HYBRID = "0"
  process.env.COHERE_RERANK = "0"
  delete process.env.COHERE_API_KEY
  jest.restoreAllMocks()
})

afterEach(() => {
  resetTypesenseSearchEngineCache()
  delete process.env.SEARCH_SOURCE
  delete process.env.TYPESENSE_HYBRID
})

describe("isTypesenseHybridEnabled", () => {
  it("stays off without flag or key", async () => {
    const { isTypesenseHybridEnabled } = await import("../config/commerce")
    process.env.TYPESENSE_HYBRID = "0"
    delete process.env.COHERE_API_KEY
    expect(isTypesenseHybridEnabled()).toBe(false)
  })

  it("turns on when TYPESENSE_HYBRID=1 and COHERE_API_KEY set", async () => {
    const { isTypesenseHybridEnabled } = await import("../config/commerce")
    process.env.TYPESENSE_HYBRID = "1"
    process.env.COHERE_API_KEY = "test-key"
    expect(isTypesenseHybridEnabled()).toBe(true)
  })
})

describe("toProductDoc", () => {
  it("maps Vietnamese title/handle into Typesense fields", () => {
    const doc = toProductDoc(catalog[0]!)
    expect(doc).toMatchObject({
      id: "p1",
      name: "Chè Tôm",
      handle: "che-tom",
      slug: "che-tom",
      sale_price: 150000,
      price: 150000,
      category: "Trà",
      in_stock: true,
    })
  })
})

describe("mapTypesenseHitScore", () => {
  it("maps strong text_match to HIGH", () => {
    expect(
      mapTypesenseHitScore({ text_match: 2_000_000 }, 0, false)
    ).toBe(HIGH_THRESHOLD)
  })

  it("maps vector distance to MED when hybrid", () => {
    expect(
      mapTypesenseHitScore({ vector_distance: 0.6 }, 2, true)
    ).toBe(MED_THRESHOLD)
  })

  it("returns 0 without signals", () => {
    expect(mapTypesenseHitScore({}, 0, true)).toBe(0)
  })
})

describe("getSearchEngine", () => {
  it("defaults to lib when SEARCH_SOURCE unset", () => {
    delete process.env.SEARCH_SOURCE
    expect(getSearchSource()).toBe("lib")
    expect(getSearchEngine().name).toBe("lib")
  })

  it("selects typesense when SEARCH_SOURCE=typesense", () => {
    process.env.SEARCH_SOURCE = "typesense"
    process.env.TYPESENSE_HOST = "localhost"
    process.env.TYPESENSE_API_KEY = "test"
    resetTypesenseSearchEngineCache()
    expect(getSearchSource()).toBe("typesense")
    expect(getSearchEngine().name).toBe("typesense")
  })
})

describe("createTypesenseSearchEngine", () => {
  it("hydrates product hits and builds filter_by price", async () => {
    const search = jest.fn().mockResolvedValue({
      hits: [
        {
          document: { id: "p1", slug: "che-tom" },
          text_match: 2_000_000,
        },
      ],
    })
    const client = {
      collections: () => ({
        documents: () => ({ search }),
      }),
    }

    const engine = createTypesenseSearchEngine(client as never)
    const hits = await engine.search({
      q: "chè tôm",
      priceMin: 100000,
      priceMax: 200000,
    })

    expect(hits).toHaveLength(1)
    expect(hits[0]?.product.slug).toBe("che-tom")
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "chè tôm",
        filter_by: "sale_price:>=100000 && sale_price:<=200000",
      })
    )
  })

  it("browses with sort_by when q is empty", async () => {
    const search = jest.fn().mockResolvedValue({
      hits: [{ document: { id: "p1" }, text_match: 1 }],
    })
    const client = {
      collections: () => ({
        documents: () => ({ search }),
      }),
    }

    const engine = createTypesenseSearchEngine(client as never)
    await engine.search({ sort: "price_asc" })

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "*",
        sort_by: "sale_price:asc",
      })
    )
  })
})

describe("searchCatalogQuery Typesense fail-soft", () => {
  it("keeps lib engine as independent fail-soft path", async () => {
    process.env.SEARCH_SOURCE = "typesense"
    process.env.TYPESENSE_HOST = "localhost"
    process.env.TYPESENSE_API_KEY = "test"
    resetTypesenseSearchEngineCache()

    expect(getSearchSource()).toBe("typesense")
    expect(getSearchEngine().name).toBe("typesense")

    // search-catalog.ts catches Typesense errors and calls libSearchEngine —
    // assert lib still ranks tea catalog without Typesense.
    const libHits = await libSearchEngine.search("chè tôm")
    expect(libHits[0]?.product.slug).toBe("che-tom")
  })

  it("uses lib when SEARCH_SOURCE=lib", async () => {
    process.env.SEARCH_SOURCE = "lib"
    const hits = await searchCatalogQuery("chè tôm")
    expect(hits[0]?.product.slug).toBe("che-tom")
  })
})
