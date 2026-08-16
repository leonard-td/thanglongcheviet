import { rowColumnsForImport } from "../import-json"

describe("rowColumnsForImport", () => {
  const columns = ["id", "title", "hero_images", "updated_at"]

  it("merge mode skips null and undefined fields", () => {
    expect(
      rowColumnsForImport("merge", columns, {
        id: "abc",
        title: "Hello",
        hero_images: null,
        updated_at: undefined,
      })
    ).toEqual(["id", "title"])
  })

  it("merge mode keeps explicit values including empty string and zero", () => {
    expect(
      rowColumnsForImport("merge", columns, {
        id: "abc",
        title: "",
        hero_images: "[]",
      })
    ).toEqual(["id", "title", "hero_images"])
  })

  it("replace mode includes all known columns", () => {
    expect(
      rowColumnsForImport("replace", columns, {
        id: "abc",
        title: "Hello",
      })
    ).toEqual(columns)
  })
})
