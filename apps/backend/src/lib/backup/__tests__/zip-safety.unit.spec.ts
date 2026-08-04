import {
  validateZipMetadata,
  type ZipSafetyLimits,
} from "../zip-safety"

const limits: ZipSafetyLimits = {
  maxEntries: 2,
  maxTotalBytes: 1_000,
  maxEntryBytes: 800,
  maxCompressionRatio: 10,
}

describe("backup zip safety", () => {
  it("accepts metadata within every limit", () => {
    expect(() =>
      validateZipMetadata(
        [
          { path: "manifest.json", compressedSize: 20, uncompressedSize: 100 },
          { path: "tables/users.csv", compressedSize: 50, uncompressedSize: 500 },
        ],
        limits
      )
    ).not.toThrow()
  })

  it("rejects too many entries and excessive total size", () => {
    expect(() =>
      validateZipMetadata(
        [
          { path: "a", compressedSize: 10, uncompressedSize: 100 },
          { path: "b", compressedSize: 10, uncompressedSize: 100 },
          { path: "c", compressedSize: 10, uncompressedSize: 100 },
        ],
        limits
      )
    ).toThrow("too many entries")

    expect(() =>
      validateZipMetadata(
        [
          { path: "a", compressedSize: 100, uncompressedSize: 600 },
          { path: "b", compressedSize: 100, uncompressedSize: 500 },
        ],
        limits
      )
    ).toThrow("archive exceeds extracted size limit")
  })

  it("rejects oversized or suspiciously compressed entries", () => {
    expect(() =>
      validateZipMetadata(
        [{ path: "large", compressedSize: 100, uncompressedSize: 801 }],
        limits
      )
    ).toThrow("entry exceeds extracted size limit")

    expect(() =>
      validateZipMetadata(
        [{ path: "bomb", compressedSize: 10, uncompressedSize: 101 }],
        limits
      )
    ).toThrow("compression ratio limit")
  })

  it("rejects duplicate paths and invalid declared sizes", () => {
    expect(() =>
      validateZipMetadata(
        [
          { path: "same", compressedSize: 10, uncompressedSize: 10 },
          { path: "same", compressedSize: 10, uncompressedSize: 10 },
        ],
        limits
      )
    ).toThrow("Duplicate zip entry path")

    expect(() =>
      validateZipMetadata(
        [{ path: "invalid", compressedSize: 0, uncompressedSize: 1 }],
        limits
      )
    ).toThrow("Invalid compression metadata")
  })
})
