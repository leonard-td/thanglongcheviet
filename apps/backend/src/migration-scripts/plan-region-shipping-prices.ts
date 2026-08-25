const REGION_PRICE_PLACEHOLDER = "__region__";

export type SeedShippingOptionPrice = {
  currency_code?: string;
  region_id?: string;
  amount: number;
};

// Seed data marks a shipping option's region-scoped price with the
// "__region__" placeholder because the real region doesn't exist yet at
// seed-data-authoring time. Splitting immediate (currency-based) prices from
// deferred (region-based) ones lets the shipping option be created before
// the region exists — the deferred price is attached afterwards once the
// region is available (see buildAddRegionPriceInput).
export function splitShippingOptionPrices<T extends SeedShippingOptionPrice>(
  prices: T[]
): { immediate: T[]; deferred: T[] } {
  const immediate: T[] = [];
  const deferred: T[] = [];

  for (const price of prices) {
    if (price.region_id === REGION_PRICE_PLACEHOLDER) {
      deferred.push(price);
    } else {
      immediate.push(price);
    }
  }

  return { immediate, deferred };
}

export type AddRegionPriceInput = {
  priceSetId: string;
  prices: Array<{
    currency_code: string;
    amount: number;
    rules: { region_id: string };
  }>;
};

// Shape expected by PricingModuleService.addPrices() to attach a
// region-scoped price to a shipping option's existing price set.
export function buildAddRegionPriceInput(
  priceSetId: string,
  region: { id: string; currency_code: string },
  deferredPrice: { amount: number }
): AddRegionPriceInput {
  return {
    priceSetId,
    prices: [
      {
        currency_code: region.currency_code,
        amount: deferredPrice.amount,
        rules: { region_id: region.id },
      },
    ],
  };
}
