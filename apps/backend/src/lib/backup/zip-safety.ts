export type ZipSafetyLimits = {
  maxEntries: number
  maxTotalBytes: number
  maxEntryBytes: number
  maxCompressionRatio: number
}

export type ZipEntryMetadata = {
  path: string
  compressedSize: number
  uncompressedSize: number
}

const MIB = 1024 * 1024
const GIB = 1024 * MIB

function boundedInteger(
  name: string,
  fallback: number,
  min: number,
  max: number
): number {
  const raw = process.env[name]
  if (raw === undefined || raw === "") return fallback

  const value = Number(raw)
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`)
  }
  return value
}

export function getZipSafetyLimits(): ZipSafetyLimits {
  return {
    maxEntries: boundedInteger(
      "BACKUP_RESTORE_MAX_ENTRIES",
      100_000,
      1,
      1_000_000
    ),
    maxTotalBytes: boundedInteger(
      "BACKUP_RESTORE_MAX_EXTRACTED_BYTES",
      8 * GIB,
      MIB,
      64 * GIB
    ),
    maxEntryBytes: boundedInteger(
      "BACKUP_RESTORE_MAX_ENTRY_BYTES",
      4 * GIB,
      MIB,
      16 * GIB
    ),
    maxCompressionRatio: boundedInteger(
      "BACKUP_RESTORE_MAX_COMPRESSION_RATIO",
      1_000,
      1,
      10_000
    ),
  }
}

export function validateZipMetadata(
  entries: ZipEntryMetadata[],
  limits: ZipSafetyLimits
): void {
  if (entries.length > limits.maxEntries) {
    throw new Error(
      `Backup archive contains too many entries (${entries.length}; limit ${limits.maxEntries})`
    )
  }

  let declaredTotal = 0
  const paths = new Set<string>()
  for (const entry of entries) {
    if (paths.has(entry.path)) {
      throw new Error(`Duplicate zip entry path: ${entry.path}`)
    }
    paths.add(entry.path)

    const { compressedSize, uncompressedSize } = entry
    if (
      !Number.isSafeInteger(compressedSize) ||
      compressedSize < 0 ||
      !Number.isSafeInteger(uncompressedSize) ||
      uncompressedSize < 0
    ) {
      throw new Error(`Invalid size metadata for zip entry: ${entry.path}`)
    }
    if (uncompressedSize > limits.maxEntryBytes) {
      throw new Error(
        `Zip entry exceeds extracted size limit: ${entry.path} (${uncompressedSize} bytes)`
      )
    }
    if (uncompressedSize > 0 && compressedSize === 0) {
      throw new Error(`Invalid compression metadata for zip entry: ${entry.path}`)
    }
    if (
      compressedSize > 0 &&
      uncompressedSize / compressedSize > limits.maxCompressionRatio
    ) {
      throw new Error(
        `Zip entry exceeds compression ratio limit: ${entry.path}`
      )
    }

    declaredTotal += uncompressedSize
    if (
      !Number.isSafeInteger(declaredTotal) ||
      declaredTotal > limits.maxTotalBytes
    ) {
      throw new Error(
        `Backup archive exceeds extracted size limit (${limits.maxTotalBytes} bytes)`
      )
    }
  }
}
