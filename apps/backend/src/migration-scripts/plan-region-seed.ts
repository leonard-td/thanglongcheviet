export type RegionCountryAssignment = {
  iso_2: string;
  region_id: string | null;
};

export type RegionSeedPlan =
  | { action: "create" }
  | { action: "reuse"; regionId: string }
  | { action: "error"; message: string };

// Re-running the seed must not crash on Medusa's "country already assigned
// to a region" validation. Decide up front, from the countries' CURRENT
// region assignment, whether it's safe to create a fresh region, safe to
// reuse an existing one (idempotent re-run), or unsafe to guess (mixed/
// partial assignment) — in which case we refuse and ask for manual cleanup
// rather than silently mutating an unrelated region's country list.
export function planRegionSeed(
  countryCodes: string[],
  existingAssignments: RegionCountryAssignment[]
): RegionSeedPlan {
  const regionIdByCountry = new Map(
    existingAssignments.map((a) => [a.iso_2, a.region_id])
  );

  const distinctRegionIds = new Set(
    countryCodes
      .map((code) => regionIdByCountry.get(code) ?? null)
      .filter((id): id is string => !!id)
  );

  if (distinctRegionIds.size === 0) {
    return { action: "create" };
  }

  const [singleRegionId] = distinctRegionIds;
  const allMatchSingleRegion =
    distinctRegionIds.size === 1 &&
    countryCodes.every(
      (code) => regionIdByCountry.get(code) === singleRegionId
    );

  if (allMatchSingleRegion) {
    return { action: "reuse", regionId: singleRegionId };
  }

  return {
    action: "error",
    message:
      `Cannot seed region: countries [${countryCodes.join(", ")}] are ` +
      `already split across ${distinctRegionIds.size} region(s), or only ` +
      `some of them are assigned to a region. Resolve the region/country ` +
      `assignment manually before re-running the seed.`,
  };
}
