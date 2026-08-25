import { describe, expect, it } from "@jest/globals";

import { normalizeSeedKey, partitionSeedItems } from "../partition-seed-items";

describe("normalizeSeedKey", () => {
  it("treats NFC and NFD forms of the same Vietnamese text as equal", () => {
    const nfc = "Thăng Long Chè Việt".normalize("NFC");
    const nfd = "Thăng Long Chè Việt".normalize("NFD");

    expect(nfc).not.toEqual(nfd); // sanity check: different byte sequences
    expect(normalizeSeedKey(nfc)).toEqual(normalizeSeedKey(nfd));
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeSeedKey("  Kho mặc định  ")).toEqual("Kho mặc định");
  });
});

describe("partitionSeedItems", () => {
  it("treats every item as missing when nothing exists yet", () => {
    const { existing, missing } = partitionSeedItems(
      [{ name: "Danh mục A" }, { name: "Danh mục B" }],
      [],
      (item) => item.name
    );

    expect(existing).toEqual([]);
    expect(missing).toEqual([{ name: "Danh mục A" }, { name: "Danh mục B" }]);
  });

  it("separates items whose key already exists from the rest", () => {
    const { existing, missing } = partitionSeedItems(
      [{ name: "Danh mục A" }, { name: "Danh mục B" }],
      ["Danh mục A"],
      (item) => item.name
    );

    expect(existing).toEqual([{ name: "Danh mục A" }]);
    expect(missing).toEqual([{ name: "Danh mục B" }]);
  });

  it("treats every item as existing when all keys are already present", () => {
    const { existing, missing } = partitionSeedItems(
      [{ name: "Danh mục A" }],
      ["Danh mục A", "Danh mục B"],
      (item) => item.name
    );

    expect(existing).toEqual([{ name: "Danh mục A" }]);
    expect(missing).toEqual([]);
  });

  it("matches an existing key even when its Unicode normalization form differs", () => {
    const seedName = "Thăng Long Chè Việt".normalize("NFC");
    const dbName = "Thăng Long Chè Việt".normalize("NFD");

    const { existing, missing } = partitionSeedItems(
      [{ name: seedName }],
      [dbName],
      (item) => item.name
    );

    expect(existing).toEqual([{ name: seedName }]);
    expect(missing).toEqual([]);
  });

  it("does not crash when an existing key is null, undefined, or empty", () => {
    const { existing, missing } = partitionSeedItems(
      [{ name: "Danh mục A" }],
      [null, undefined, "", "Danh mục A"] as Array<string | null | undefined>,
      (item) => item.name
    );

    expect(existing).toEqual([{ name: "Danh mục A" }]);
    expect(missing).toEqual([]);
  });
});
