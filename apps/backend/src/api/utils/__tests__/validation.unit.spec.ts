import { isCalendarDate } from "../date"
import { parsePagination } from "../pagination"

describe("store API input validation", () => {
  it("rejects impossible calendar dates", () => {
    expect(isCalendarDate("2026-02-29")).toBe(false)
    expect(isCalendarDate("2026-99-99")).toBe(false)
    expect(isCalendarDate("2026-08-01")).toBe(true)
  })

  it("parses bounded pagination", () => {
    expect(
      parsePagination({ limit: "500", offset: "2" }, { limit: 20, max: 100 })
    ).toEqual({ limit: 100, offset: 2 })
  })

  it("rejects negative pagination", () => {
    expect(() =>
      parsePagination({ limit: "-1" }, { limit: 20, max: 100 })
    ).toThrow("limit must be a non-negative integer")
  })
})
