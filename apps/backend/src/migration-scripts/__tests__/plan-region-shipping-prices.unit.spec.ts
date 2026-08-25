import { describe, expect, it } from "@jest/globals";

import {
  buildAddRegionPriceInput,
  splitShippingOptionPrices,
} from "../plan-region-shipping-prices";

describe("splitShippingOptionPrices", () => {
  it("keeps currency-based prices as immediate", () => {
    const { immediate, deferred } = splitShippingOptionPrices([
      { currency_code: "vnd", amount: 30000 },
    ]);

    expect(immediate).toEqual([{ currency_code: "vnd", amount: 30000 }]);
    expect(deferred).toEqual([]);
  });

  it("defers the placeholder region price", () => {
    const { immediate, deferred } = splitShippingOptionPrices([
      { currency_code: "vnd", amount: 30000 },
      { region_id: "__region__", amount: 0 },
    ]);

    expect(immediate).toEqual([{ currency_code: "vnd", amount: 30000 }]);
    expect(deferred).toEqual([{ region_id: "__region__", amount: 0 }]);
  });
});

describe("buildAddRegionPriceInput", () => {
  it("builds an addPrices payload scoped to the region's currency and id", () => {
    const input = buildAddRegionPriceInput(
      "pset_123",
      { id: "reg_vn", currency_code: "vnd" },
      { amount: 0 }
    );

    expect(input).toEqual({
      priceSetId: "pset_123",
      prices: [
        {
          currency_code: "vnd",
          amount: 0,
          rules: { region_id: "reg_vn" },
        },
      ],
    });
  });
});
