// The seed script runs on every deploy against a database that may already
// have data (see deploy.sh / run-prod-stack.sh, which always run
// initial-data-seed). Several seeded entities have a unique DB constraint
// on their natural key (fulfillment_set.name, product_category.handle,
// product.handle, ...), so blindly re-creating everything crashes on the
// second run. partitionSeedItems() splits seed items into ones that already
// exist (safe to reuse/skip) and ones that still need to be created —
// reused by every idempotent seed step instead of duplicating this check.
//
// Vietnamese text can reach this script/the database in different Unicode
// normalization forms (NFC vs. NFD — the same visible text, different byte
// sequences), e.g. depending on how a value was typed/saved over time. A
// naive `WHERE name IN (...)` / `Set.has()` string comparison then silently
// fails to match an already-seeded row (see: "Product category with
// handle: thăng-long-chè-việt, already exists." even though the seed
// script's own existence check ran first). Normalize with NFC + trim before
// comparing so visually-identical names always match.
export function normalizeSeedKey(key: string): string {
  return key.normalize("NFC").trim();
}

// existingKeys comes straight from module service `.list()` results. Those
// are typed as `string`, but in practice a row can have a blank/missing key
// (e.g. legacy data, a record outside this seed script's control) — mapping
// it to `.name`/`.handle` then yields `null`/`undefined` at runtime and
// crashes normalizeSeedKey() with "Cannot read properties of undefined
// (reading 'normalize')". Such keys can never meaningfully match a seed
// item's key, so they're simply filtered out instead of crashing.
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function partitionSeedItems<T>(
  items: T[],
  existingKeys: Iterable<string | null | undefined>,
  keyOf: (item: T) => string
): { existing: T[]; missing: T[] } {
  const existingKeySet = new Set(
    Array.from(existingKeys).filter(isNonEmptyString).map(normalizeSeedKey)
  );
  const existing: T[] = [];
  const missing: T[] = [];

  for (const item of items) {
    if (existingKeySet.has(normalizeSeedKey(keyOf(item)))) {
      existing.push(item);
    } else {
      missing.push(item);
    }
  }

  return { existing, missing };
}
