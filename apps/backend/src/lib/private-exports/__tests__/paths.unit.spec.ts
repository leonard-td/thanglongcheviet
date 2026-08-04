import { resolvePrivateExportFile, PRIVATE_EXPORT_FILE_RE } from "../paths"

describe("private-exports paths", () => {
  it("accepts valid Medusa private export filenames", () => {
    expect(
      PRIVATE_EXPORT_FILE_RE.test(
        "private-1785550706257-1785550706254-order-exports.csv"
      )
    ).toBe(true)
  })

  it("rejects path traversal in filenames", () => {
    expect(resolvePrivateExportFile("../secrets.env")).toBeNull()
    expect(resolvePrivateExportFile("private-1-../../etc/passwd")).toBeNull()
  })

  it("rejects public upload filenames", () => {
    expect(resolvePrivateExportFile("branding-favicon.png")).toBeNull()
  })
})
