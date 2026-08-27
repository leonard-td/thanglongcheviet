import fs from "node:fs";
import path from "node:path";
import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductOptionsWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  createStoresWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/core-flows";
import type {
  IFulfillmentModuleService,
  IPricingModuleService,
  IProductModuleService,
  IRegionModuleService,
  IStockLocationService,
  ITaxModuleService,
  RegionCountryDTO,
} from "@medusajs/framework/types";
import initialDataSeedJson from "./data/initial-data.json";
import { normalizeSeedKey, partitionSeedItems } from "./partition-seed-items";
import { planRegionSeed } from "./plan-region-seed";
import {
  buildAddRegionPriceInput,
  splitShippingOptionPrices,
} from "./plan-region-shipping-prices";
import { CARD_MODULE } from "../modules/card";
import { CAMPAIGN_MODULE } from "../modules/campaign";
import { NAVIGATION_MODULE } from "../modules/navigation";
import { SITE_SETTINGS_MODULE } from "../modules/site-settings";
import type CardModuleService from "../modules/card/service";
import type CampaignModuleService from "../modules/campaign/service";
import type NavigationModuleService from "../modules/navigation/service";
import type SiteSettingsModuleService from "../modules/site-settings/service";

type LoggerLike = {
  info: (message: string) => void;
};

type SeedData = {
  store: {
    sales_channel: { name: string; description: string };
    publishable_api_key: { title: string; type: string; created_by: string };
    store: {
      name: string;
      supported_currencies: Array<{ currency_code: string; is_default: boolean }>;
    };
  };
  region: {
    name: string;
    currency_code: string;
    countries: string[];
    payment_providers: string[];
  };
  stock_location: {
    name: string;
    address: { city: string; country_code: string; address_1: string };
  };
  fulfillment: {
    name: string;
    type: string;
    service_zones: Array<{
      name: string;
      geo_zones: Array<{ country_code: string; type: string }>;
    }>;
    shipping_options: Array<{
      name: string;
      price_type: string;
      provider_id: string;
      type: { label: string; description: string; code: string };
      prices: Array<{ currency_code?: string; region_id?: string; amount: number }>;
      rules: Array<{ attribute: string; value: string; operator: string }>;
    }>;
  };
  products: {
    categories: Array<{ name: string; is_active: boolean }>;
    options: Array<{ title: string; values: string[] }>;
    items: Array<{
      title: string;
      category: string;
      description: string;
      handle: string;
      weight: number;
      status: string;
      /** Storefront flags (e.g. `featured`) read from product.metadata. */
      metadata?: Record<string, unknown>;
      images: Array<{ url: string }>;
      options: string[];
      variants: Array<{
        title: string;
        sku: string;
        options: Record<string, string>;
        prices: Array<{ amount: number; currency_code: string }>;
      }>;
    }>;
  };
  site_settings?: {
    store_name?: string;
    email?: string;
    phone?: string;
    hotline?: string;
    address?: string;
    website_url?: string;
    translations?: Record<string, { tagline?: string; description?: string }>;
    google_map_url?: string;
    open_hours?: string;
    facebook_url?: string;
    zalo_url?: string;
    instagram_url?: string;
    home_video_url?: string;
  };
  content: {
    cards: Array<{
      title?: Record<string, string> | null;
      path?: string | null;
      image?: string | null;
      type: string;
      rank: number;
      is_active: boolean;
      locked: boolean;
    }>;
    campaign_topics: Array<{
      name: string;
      slug: string;
      description?: string | null;
      rank: number;
      content_type?: string;
    }>;
    campaign_posts: Array<{
      title: string;
      slug: string;
      description?: string | null;
      is_active: boolean;
      publish_at?: Date | null;
      unpublish_at?: Date | null;
      content: unknown;
      topic_slug?: string;
    }>;
    navigation: {
      menu: { id: string; name: string; slug: string };
      tree: Array<{
        label: string;
        url: string;
        children?: Array<{ label: string; url: string }>;
      }>;
    };
  };
};

const defaultSeedData = initialDataSeedJson as SeedData;

function assertSeedData(data: unknown): asserts data is SeedData {
  if (!data || typeof data !== "object") {
    throw new Error("Seed data must be a valid JSON object.");
  }

  const seedData = data as Partial<SeedData>;
  if (!seedData.store || !seedData.region || !seedData.products || !seedData.content) {
    throw new Error("Seed data is missing one of the required sections.");
  }
}

export async function getDefaultSeedData(): Promise<SeedData> {
  return structuredClone(defaultSeedData);
}

export async function loadSeedData(
  source?: SeedData | string | null
): Promise<SeedData> {
  if (!source) {
    return getDefaultSeedData();
  }

  if (typeof source === "string") {
    const resolvedPath = path.isAbsolute(source)
      ? source
      : path.resolve(process.cwd(), source);
    const raw = fs.readFileSync(resolvedPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    assertSeedData(parsed);
    return parsed;
  }

  assertSeedData(source);
  return source;
}

/**
 * Creating a region whose countries already belong to another region throws
 * ("Countries with codes ... are already assigned to a region") — this makes
 * the seed crash whenever it's re-run against a database that already has
 * the region. planRegionSeed() inspects the countries' current assignment
 * first so we can either create fresh, reuse the exact existing region
 * (idempotent re-run), or fail loudly instead of guessing at a
 * partial/conflicting assignment.
 *
 * Runs LAST in the overall seed (see initial_data_seed below), after the
 * store/product/content/site-settings data — nothing else in this script
 * actually needs the region to exist except the region-scoped shipping
 * price, which is deferred and applied separately via
 * applyPendingRegionShippingPrices() once this function returns.
 */
async function seedRegion({
  container,
  logger,
  seedData,
}: {
  container: MedusaContainer;
  logger: LoggerLike;
  seedData: SeedData;
}) {
  logger.info("Seeding region data...");

  const regionModuleService = container.resolve<IRegionModuleService>(
    Modules.REGION
  );

  // `region_id` is a real column on region_country but isn't part of the
  // public RegionCountryDTO (it's normally reached via the `region`
  // relation) — the cast reflects what `select: ["iso_2", "region_id"]`
  // actually returns at runtime.
  const existingAssignments = (await regionModuleService.listCountries(
    { iso_2: seedData.region.countries },
    { select: ["iso_2", "region_id"] }
  )) as Array<RegionCountryDTO & { region_id: string | null }>;

  const plan = planRegionSeed(seedData.region.countries, existingAssignments);

  if (plan.action === "error") {
    throw new Error(plan.message);
  }

  let region: { id: string; name: string; currency_code: string };
  if (plan.action === "reuse") {
    logger.info(
      `Countries [${seedData.region.countries.join(", ")}] already belong to region "${plan.regionId}" — reusing it.`
    );
    region = await regionModuleService.retrieveRegion(plan.regionId);
  } else {
    const { result: regionResult } = await createRegionsWorkflow(
      container
    ).run({
      input: {
        regions: [
          {
            name: seedData.region.name,
            currency_code: seedData.region.currency_code,
            countries: seedData.region.countries,
            payment_providers: seedData.region.payment_providers,
          },
        ],
      },
    });
    region = regionResult[0];
  }

  // tax_region has a unique constraint per country (no province_code) — when
  // the region above is reused, its tax regions already exist too, and
  // unconditionally recreating them crashes with "Tax region with
  // country_code: vn, already exists.". Only create the ones still missing.
  const taxModuleService = container.resolve<ITaxModuleService>(Modules.TAX);
  const existingTaxRegions = await taxModuleService.listTaxRegions(
    { country_code: seedData.region.countries },
    { select: ["id", "country_code"] }
  );
  const { existing: matchedExistingTaxRegions, missing: missingTaxRegionCountries } =
    partitionSeedItems(
      seedData.region.countries.map((country_code) => ({ country_code })),
      existingTaxRegions.map((taxRegion) => taxRegion.country_code),
      (item) => item.country_code
    );

  if (matchedExistingTaxRegions.length) {
    logger.info(
      `Tax regions for [${matchedExistingTaxRegions.map((item) => item.country_code).join(", ")}] already exist — reusing them.`
    );
  }

  if (missingTaxRegionCountries.length) {
    logger.info("Seeding tax regions...");
    await createTaxRegionsWorkflow(container).run({
      input: missingTaxRegionCountries.map(({ country_code }) => ({
        country_code,
        provider_id: "tp_system",
      })),
    });
  }

  return region;
}

/**
 * The seed data marks a shipping option's region-scoped price with the
 * "__region__" placeholder (see splitShippingOptionPrices) because the
 * region doesn't exist yet when shipping options are created — seedRegion()
 * now runs last. This attaches that deferred price to each shipping
 * option's existing price set once the real region is available, using the
 * same shipping_option -> price_set link Medusa's own shipping-option
 * workflows rely on internally.
 */
async function applyPendingRegionShippingPrices({
  container,
  logger,
  region,
  pending,
}: {
  container: MedusaContainer;
  logger: LoggerLike;
  region: { id: string; currency_code: string };
  pending: Array<{ shippingOptionId: string; amount: number }>;
}) {
  if (!pending.length) {
    return;
  }

  logger.info("Applying region-scoped shipping prices...");

  const shippingOptionIds = [
    ...new Set(pending.map((item) => item.shippingOptionId)),
  ];

  // The shipping_option <-> price_set link module (registered by the
  // fulfillment module as "shipping_option_price_set") is what Medusa's own
  // shipping-option workflows use internally to attach prices — querying it
  // directly here is the supported way to find an existing price set id
  // without a documented "add region price to shipping option" workflow.
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data: links } = await query.graph({
    entity: "shipping_option_price_set",
    fields: ["shipping_option_id", "price_set_id"],
    filters: { shipping_option_id: shippingOptionIds },
  });

  const priceSetIdByOption = new Map(
    (links as Array<{ shipping_option_id: string; price_set_id: string }>).map(
      (link) => [link.shipping_option_id, link.price_set_id]
    )
  );

  const pricingModuleService = container.resolve<IPricingModuleService>(
    Modules.PRICING
  );

  for (const item of pending) {
    const priceSetId = priceSetIdByOption.get(item.shippingOptionId);
    if (!priceSetId) {
      throw new Error(
        `Cannot find a price set for shipping option "${item.shippingOptionId}" — was it created successfully?`
      );
    }
    await pricingModuleService.addPrices(
      buildAddRegionPriceInput(priceSetId, region, item)
    );
  }
}

async function seedStoreData({
  container,
  logger,
  seedData,
}: {
  container: MedusaContainer;
  logger: LoggerLike;
  seedData: SeedData;
}) {
  logger.info("Seeding store data...");

  const {
    result: [defaultSalesChannel],
  } = await createSalesChannelsWorkflow(container).run({
    input: {
      salesChannelsData: [
        {
          name: seedData.store.sales_channel.name,
          description: seedData.store.sales_channel.description,
        },
      ],
    },
  });

  const {
    result: [publishableApiKey],
  } = await createApiKeysWorkflow(container).run({
    input: {
      api_keys: [
        {
          title: seedData.store.publishable_api_key.title,
          type: seedData.store.publishable_api_key.type as "publishable",
          created_by: seedData.store.publishable_api_key.created_by,
        },
      ],
    },
  });

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableApiKey.id,
      add: [defaultSalesChannel.id],
    },
  });

  await createStoresWorkflow(container).run({
    input: {
      stores: [
        {
          name: seedData.store.store.name,
          supported_currencies: seedData.store.store.supported_currencies,
          default_sales_channel_id: defaultSalesChannel.id,
        },
      ],
    },
  });

  logger.info("Seeding stock location data...");
  // A stock location can only be linked to a single fulfillment set
  // (LocationFulfillmentSet is a 1-1 link) — creating a new stock location
  // on every deploy would try to link it to the same reused fulfillment
  // set and crash with "Cannot create multiple links between
  // 'stock_location' and 'fulfillment'". Reuse the existing location
  // (matched by name) instead of creating a new one every run.
  const stockLocationModuleService = container.resolve<IStockLocationService>(
    Modules.STOCK_LOCATION
  );
  // No `name` filter — see the fulfillment set lookup above for why.
  const allStockLocations = await stockLocationModuleService.listStockLocations(
    {},
    { select: ["id", "name"], take: 1000 }
  );
  const existingStockLocation = allStockLocations.find(
    (location) =>
      normalizeSeedKey(location.name) === normalizeSeedKey(seedData.stock_location.name)
  );

  let stockLocation: { id: string };
  if (existingStockLocation) {
    logger.info(
      `Stock location "${seedData.stock_location.name}" already exists — reusing it.`
    );
    stockLocation = existingStockLocation;
  } else {
    const { result: stockLocationResult } = await createStockLocationsWorkflow(
      container
    ).run({
      input: {
        locations: [
          {
            name: seedData.stock_location.name,
            address: seedData.stock_location.address,
          },
        ],
      },
    });
    stockLocation = stockLocationResult[0];
  }

  const link = container.resolve(ContainerRegistrationKeys.LINK);

  const existingProviderLinks = await link.list({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
  });
  if (!existingProviderLinks.length) {
    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_provider_id: "manual_manual",
      },
    });
  }

  logger.info("Seeding fulfillment data...");
  const fulfillmentModuleService = container.resolve<IFulfillmentModuleService>(
    Modules.FULFILLMENT
  );

  // fulfillment_set.name has a unique DB constraint — re-running the seed
  // against an already-seeded database (this script runs on every deploy,
  // see deploy.sh) would otherwise crash with "Fulfillment set with name:
  // ..., already exists." Reuse the existing set instead of recreating it.
  // Fetch all sets and match client-side (normalized) rather than filtering
  // by `name` server-side — Vietnamese text can reach the DB in a different
  // Unicode normalization form (NFC vs. NFD) than the seed JSON, which would
  // make an exact-match DB filter silently miss an existing row (see the
  // same issue with product categories: normalizeSeedKey()'s doc comment).
  const allFulfillmentSets = await fulfillmentModuleService.listFulfillmentSets(
    {},
    { select: ["id", "name"], take: 1000, relations: ["service_zones"] }
  );
  const existingFulfillmentSet = allFulfillmentSets.find(
    (set) => normalizeSeedKey(set.name) === normalizeSeedKey(seedData.fulfillment.name)
  );

  let fulfillmentSet: { id: string; service_zones: Array<{ id: string }> };
  if (existingFulfillmentSet) {
    if (!existingFulfillmentSet.service_zones?.length) {
      throw new Error(
        `Fulfillment set "${seedData.fulfillment.name}" already exists but has no service zones — resolve manually before re-running the seed.`
      );
    }
    logger.info(
      `Fulfillment set "${seedData.fulfillment.name}" already exists — reusing it.`
    );
    fulfillmentSet = existingFulfillmentSet;
  } else {
    fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: seedData.fulfillment.name,
      type: seedData.fulfillment.type,
      service_zones: seedData.fulfillment.service_zones.map((zone) => ({
        name: zone.name,
        geo_zones: zone.geo_zones.map((geoZone) => ({
          country_code: geoZone.country_code,
          type: "country" as const,
        })),
      })),
    });
  }

  const existingFulfillmentSetLinks = await link.list({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
  });
  if (!existingFulfillmentSetLinks.length) {
    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_set_id: fulfillmentSet.id,
      },
    });
  }

  // The region doesn't exist yet (seedRegion() runs last — see
  // initial_data_seed) so any "__region__"-placeholder price is deferred:
  // the shipping option is created with only its currency-based prices, and
  // the deferred one is applied afterwards by
  // applyPendingRegionShippingPrices() once the region is available.
  const shippingOptionsWithSplitPrices = seedData.fulfillment.shipping_options.map(
    (option) => ({
      option,
      ...splitShippingOptionPrices(option.prices),
    })
  );

  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data: shippingProfileResult } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  });
  const shippingProfile = shippingProfileResult[0];

  // shipping_option.name has no unique DB constraint, so a naive re-run
  // wouldn't crash here — it would silently create duplicate shipping
  // options that customers then see twice at checkout. Reuse existing ones
  // (matched by name within this service zone) instead.
  const allShippingOptions = await fulfillmentModuleService.listShippingOptions(
    {},
    { select: ["id", "name", "service_zone_id"], take: 1000 }
  );
  const existingShippingOptionsInZone = allShippingOptions.filter(
    (option) => option.service_zone_id === fulfillmentSet.service_zones[0].id
  );
  const { existing: matchedExistingShippingOptions, missing: missingShippingOptionDefs } =
    partitionSeedItems(
      shippingOptionsWithSplitPrices,
      existingShippingOptionsInZone.map((option) => option.name),
      (def) => def.option.name
    );

  if (matchedExistingShippingOptions.length) {
    logger.info(
      `${matchedExistingShippingOptions.length} shipping options already exist — leaving them untouched.`
    );
  }

  let pendingRegionShippingPrices: Array<{ shippingOptionId: string; amount: number }> =
    [];

  if (missingShippingOptionDefs.length) {
    const shippingOptionsInput = missingShippingOptionDefs.map(
      ({ option, immediate }) => ({
        ...option,
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        prices: immediate,
        rules: option.rules.map((rule) => ({
          ...rule,
          operator: rule.operator as "eq" | "in",
        })),
      })
    );

    const { result: createdShippingOptions } = await createShippingOptionsWorkflow(
      container
    ).run({
      input: shippingOptionsInput as any,
    });

    pendingRegionShippingPrices = createdShippingOptions.flatMap(
      (created, index) =>
        missingShippingOptionDefs[index].deferred.map((price) => ({
          shippingOptionId: created.id,
          amount: price.amount,
        }))
    );
  }

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [defaultSalesChannel.id],
    },
  });

  return {
    defaultSalesChannel,
    stockLocation,
    shippingProfile,
    pendingRegionShippingPrices,
  };
}

async function seedProductData({
  container,
  logger,
  seedData,
  defaultSalesChannel,
  shippingProfile,
}: {
  container: MedusaContainer;
  logger: LoggerLike;
  seedData: SeedData;
  defaultSalesChannel: { id: string };
  shippingProfile: { id: string };
}) {
  logger.info("Seeding product data...");

  // product_category.handle and product.handle both have unique DB
  // constraints — this script runs on every deploy (see deploy.sh), so a
  // re-run against an already-seeded database must reuse existing
  // categories/products instead of recreating them, or it crashes with
  // "... already exists.".
  const productModuleService = container.resolve<IProductModuleService>(
    Modules.PRODUCT
  );

  // No `name` filter — see the fulfillment set lookup in seedStoreData for
  // why (Unicode normalization mismatch made an exact `name` filter miss
  // this exact category and crash with "already exists.").
  const existingCategories = await productModuleService.listProductCategories(
    {},
    { select: ["id", "name", "handle"], take: 1000 }
  );
  const { existing: matchedExistingCategories, missing: missingCategories } =
    partitionSeedItems(
      seedData.products.categories,
      existingCategories.map((category) => category.name),
      (category) => category.name
    );

  let createdCategories: Array<{ id: string; name: string }> = [];
  if (missingCategories.length) {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: missingCategories,
      },
    });
    createdCategories = result;
  }
  if (matchedExistingCategories.length) {
    logger.info(
      `${matchedExistingCategories.length} product categories already exist — reusing them.`
    );
  }

  const categoryLookup = new Map<string, { id: string }>();
  for (const category of existingCategories) {
    categoryLookup.set(normalizeSeedKey(category.name), category);
  }
  for (const category of createdCategories) {
    categoryLookup.set(normalizeSeedKey(category.name), category);
  }

  const { result: productOptionsResult } = await createProductOptionsWorkflow(
    container
  ).run({
    input: {
      product_options: seedData.products.options,
    },
  });

  const optionLookup = new Map<string, { id: string }>();
  for (const option of productOptionsResult) {
    optionLookup.set(option.title, option);
  }

  const existingProducts = await productModuleService.listProducts(
    { handle: seedData.products.items.map((item) => item.handle) },
    { select: ["id", "handle"] }
  );
  const { missing: missingProductItems } = partitionSeedItems(
    seedData.products.items,
    existingProducts.map((product) => product.handle),
    (item) => item.handle
  );

  if (existingProducts.length) {
    logger.info(
      `${existingProducts.length} products already exist (matched by handle) — leaving them untouched.`
    );
  }

  if (!missingProductItems.length) {
    return;
  }

  const products = missingProductItems.map((item) => ({
    title: item.title,
    category_ids: [categoryLookup.get(normalizeSeedKey(item.category))!.id],
    description: item.description,
    handle: item.handle,
    weight: item.weight,
    status: item.status === "published" ? ProductStatus.PUBLISHED : ProductStatus.DRAFT,
    metadata: item.metadata ?? undefined,
    shipping_profile_id: shippingProfile.id,
    images: item.images,
    options: item.options.map((optionName) => ({ id: optionLookup.get(optionName)!.id })),
    variants: item.variants.map((variant) => ({
      title: variant.title,
      sku: variant.sku,
      options: variant.options,
      prices: variant.prices.map((price) => ({
        amount: price.amount,
        currency_code: price.currency_code,
      })),
    })),
    sales_channels: [{ id: defaultSalesChannel.id }],
  }));

  await createProductsWorkflow(container).run({
    input: {
      products,
    },
  });
}

async function seedContentData({
  container,
  logger,
  seedData,
}: {
  container: MedusaContainer;
  logger: LoggerLike;
  seedData: SeedData;
}) {
  logger.info("Seeding content data...");

  const cardModuleService = container.resolve(CARD_MODULE) as CardModuleService;
  for (const card of seedData.content.cards) {
    const cardType = card.type as "link" | "contact" | "map" | "promotions";
    const existing = await cardModuleService.listCards({
      ...(cardType === "link" && card.path ? { path: card.path } : { type: cardType }),
    });
    const match = existing[0];

    if (match) {
      await (cardModuleService as any).updateCards({
        id: match.id,
        type: cardType,
        title: card.title ?? null,
        image: card.image ?? null,
        path: card.path ?? null,
        rank: card.rank,
        is_active: card.is_active,
        locked: card.locked,
      });
    } else {
      await (cardModuleService as any).createCards({
        type: cardType,
        title: card.title ?? null,
        image: card.image ?? null,
        path: card.path ?? null,
        rank: card.rank,
        is_active: card.is_active,
        locked: card.locked,
      });
    }
  }

  const campaignModuleService = container.resolve(
    CAMPAIGN_MODULE
  ) as CampaignModuleService;
  const topicMap = new Map<string, { id: string }>();

  for (const topic of seedData.content.campaign_topics) {
    const existingTopics = await campaignModuleService.listCampaignTopics({
      slug: topic.slug,
    });
    const existingTopic = existingTopics[0];

    if (existingTopic) {
      const updated = await campaignModuleService.updateCampaignTopics({
        id: existingTopic.id,
        name: topic.name,
        slug: topic.slug,
        description: topic.description ?? null,
        image: null,
        content_type: (topic.content_type ?? "post") as "post" | "product" | "event",
        is_active: true,
        rank: topic.rank,
      });
      topicMap.set(topic.slug, updated);
    } else {
      const created = await campaignModuleService.createCampaignTopics({
        name: topic.name,
        slug: topic.slug,
        description: topic.description ?? null,
        image: null,
        content_type: (topic.content_type ?? "post") as "post" | "product" | "event",
        is_active: true,
        rank: topic.rank,
      });
      topicMap.set(topic.slug, created);
    }
  }

  for (const post of seedData.content.campaign_posts) {
    const existingPosts = await campaignModuleService.listCampaignPosts({
      slug: post.slug,
    });
    const existingPost = existingPosts[0];
    const topicId = post.topic_slug
      ? topicMap.get(post.topic_slug)?.id
      : undefined;

    if (existingPost) {
      await (campaignModuleService as any).updateCampaignPosts({
        id: existingPost.id,
        title: post.title,
        slug: post.slug,
        content: post.content as Record<string, unknown>,
        description: post.description ?? null,
        thumbnail: null,
        topic_id: topicId ?? null,
        is_active: post.is_active,
        publish_at: post.publish_at ?? null,
        unpublish_at: post.unpublish_at ?? null,
        source: null,
      });
    } else {
      await (campaignModuleService as any).createCampaignPosts({
        title: post.title,
        slug: post.slug,
        content: post.content as Record<string, unknown>,
        description: post.description ?? null,
        thumbnail: null,
        topic_id: topicId ?? null,
        is_active: post.is_active,
        publish_at: post.publish_at ?? null,
        unpublish_at: post.unpublish_at ?? null,
        source: null,
      });
    }
  }

  const navigationModuleService = container.resolve(
    NAVIGATION_MODULE
  ) as NavigationModuleService;
  const menuData = seedData.content.navigation.menu;
  const [menus] = await navigationModuleService.listAndCountNavigationMenus(
    { slug: menuData.slug },
    { take: 1 }
  );
  let menu = menus[0];

  if (!menu) {
    menu = await navigationModuleService.createNavigationMenus({
      id: menuData.id,
      name: menuData.name,
      slug: menuData.slug,
      is_active: false,
    });
  } else {
    await navigationModuleService.updateNavigationMenus({
      id: menu.id,
      name: menuData.name,
      slug: menuData.slug,
      is_active: menu.is_active,
    });
  }

  await navigationModuleService.setActiveMenu(menu.id);

  const existingItems = await navigationModuleService.listItemsByMenu(menu.id);
  if (existingItems.length > 0) {
    await navigationModuleService.deleteNavigationItems(
      existingItems.map((item) => item.id)
    );
  }

  for (const [index, node] of seedData.content.navigation.tree.entries()) {
    const root = await navigationModuleService.createNavigationItems({
      menu_id: menu.id,
      label: node.label,
      url: node.url,
      order: index,
      parent_id: null,
      is_active: true,
      openInNewTab: false,
    });

    for (const [childIndex, child] of (node.children ?? []).entries()) {
      await navigationModuleService.createNavigationItems({
        menu_id: menu.id,
        label: child.label,
        url: child.url,
        order: childIndex,
        parent_id: root.id,
        is_active: true,
        openInNewTab: false,
      });
    }
  }
}

/**
 * Fills the site-settings singleton with sane defaults so a fresh install
 * doesn't ship an all-null row — the storefront has no local fallback content,
 * so a null row renders empty contact/brand blocks. Only fills fields the admin
 * has never touched (still null) — re-running the seed never clobbers real
 * admin edits.
 */
async function seedSiteSettings({
  container,
  logger,
  seedData,
}: {
  container: MedusaContainer;
  logger: LoggerLike;
  seedData: SeedData;
}) {
  if (!seedData.site_settings) {
    return;
  }

  logger.info("Seeding default site settings...");

  const siteSettingsModuleService = container.resolve(
    SITE_SETTINGS_MODULE
  ) as SiteSettingsModuleService;

  const current = await siteSettingsModuleService.getSingleton() as Record<string, unknown>;

  const patch = Object.fromEntries(
    Object.entries(seedData.site_settings).filter(
      ([key, value]) => value !== undefined && current[key] == null
    )
  );

  if (Object.keys(patch).length > 0) {
    await siteSettingsModuleService.updateSingleton(patch);
  }
}

export default async function initial_data_seed({
  container,
  data,
}: {
  container: MedusaContainer;
  data?: SeedData | string;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const seedData = await loadSeedData(data ?? undefined);

  const {
    defaultSalesChannel,
    shippingProfile,
    pendingRegionShippingPrices,
  } = await seedStoreData({
    container,
    logger,
    seedData,
  });

  await seedProductData({
    container,
    logger,
    seedData,
    defaultSalesChannel,
    shippingProfile,
  });

  await seedContentData({
    container,
    logger,
    seedData,
  });

  await seedSiteSettings({
    container,
    logger,
    seedData,
  });

  // Runs last on purpose — see seedRegion()'s docstring. Everything above
  // only needed the store/sales-channel/product/content pieces; the region
  // itself, and the one shipping price that depends on it, are finalized
  // here at the very end.
  const region = await seedRegion({ container, logger, seedData });
  await applyPendingRegionShippingPrices({
    container,
    logger,
    region,
    pending: pendingRegionShippingPrices,
  });

  logger.info("Finished seeding initial data from JSON.");
  return {
    seedData,
    region,
    defaultSalesChannel,
    shippingProfile,
  };
}
