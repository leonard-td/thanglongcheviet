import { describe, expect, it } from "@jest/globals";

import { planRegionSeed } from "../plan-region-seed";

describe("planRegionSeed", () => {
  it("creates a new region when none of the countries are assigned yet", () => {
    const plan = planRegionSeed(["vn"], []);

    expect(plan).toEqual({ action: "create" });
  });

  it("reuses the existing region when every requested country already belongs to it", () => {
    const plan = planRegionSeed(
      ["vn"],
      [{ iso_2: "vn", region_id: "reg_existing" }]
    );

    expect(plan).toEqual({ action: "reuse", regionId: "reg_existing" });
  });

  it("reuses the existing region for a multi-country match", () => {
    const plan = planRegionSeed(
      ["vn", "us"],
      [
        { iso_2: "vn", region_id: "reg_existing" },
        { iso_2: "us", region_id: "reg_existing" },
      ]
    );

    expect(plan).toEqual({ action: "reuse", regionId: "reg_existing" });
  });

  it("errors when only some of the requested countries are assigned", () => {
    const plan = planRegionSeed(
      ["vn", "us"],
      [{ iso_2: "vn", region_id: "reg_existing" }]
    );

    expect(plan.action).toBe("error");
  });

  it("errors when requested countries are split across different regions", () => {
    const plan = planRegionSeed(
      ["vn", "us"],
      [
        { iso_2: "vn", region_id: "reg_a" },
        { iso_2: "us", region_id: "reg_b" },
      ]
    );

    expect(plan.action).toBe("error");
  });
});
