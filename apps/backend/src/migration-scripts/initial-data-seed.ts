import fs from "node:fs";
import path from "node:path";
import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
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
import initialDataSeedJson from "./data/initial-data.json";
import { CARD_MODULE } from "../modules/card";
import { CAMPAIGN_MODULE } from "../modules/campaign";
import { NAVIGATION_MODULE } from "../modules/navigation";
import type CardModuleService from "../modules/card/service";
import type CampaignModuleService from "../modules/campaign/service";
import type NavigationModuleService from "../modules/navigation/service";

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

  logger.info("Seeding region data...");
  const { result: regionResult } = await createRegionsWorkflow(container).run({
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
  const region = regionResult[0];

  logger.info("Seeding tax regions...");
  await createTaxRegionsWorkflow(container).run({
    input: seedData.region.countries.map((country_code) => ({
      country_code,
      provider_id: "tp_system",
    })),
  });

  logger.info("Seeding stock location data...");
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
  const stockLocation = stockLocationResult[0];

  const link = container.resolve(ContainerRegistrationKeys.LINK);
  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: "manual_manual",
    },
  });

  logger.info("Seeding fulfillment data...");
  const fulfillmentModuleService = container.resolve(
    ModuleRegistrationName.FULFILLMENT
  ) as {
    createFulfillmentSets: (input: any) => Promise<{ id: string; service_zones: Array<{ id: string }> }>;
  };

  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: seedData.fulfillment.name,
    type: seedData.fulfillment.type,
    service_zones: seedData.fulfillment.service_zones,
  });

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: fulfillmentSet.id,
    },
  });

  const shippingOptions = seedData.fulfillment.shipping_options.map((option) => ({
    ...option,
    service_zone_id: fulfillmentSet.service_zones[0].id,
    shipping_profile_id: undefined,
    prices: option.prices.map((price) => ({
      ...price,
      ...(price.region_id === "__region__"
        ? { region_id: region.id }
        : {}),
    })),
    rules: option.rules.map((rule) => ({
      ...rule,
      operator: rule.operator as "eq" | "in",
    })),
  }));

  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data: shippingProfileResult } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  });
  const shippingProfile = shippingProfileResult[0];

  await createShippingOptionsWorkflow(container).run({
    input: shippingOptions.map((option) => ({
      ...option,
      shipping_profile_id: shippingProfile.id,
    })) as any,
  });

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [defaultSalesChannel.id],
    },
  });

  return { defaultSalesChannel, region, stockLocation, shippingProfile };
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

  const { result: categoryResult } = await createProductCategoriesWorkflow(
    container
  ).run({
    input: {
      product_categories: seedData.products.categories,
    },
  });

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

  const categoryLookup = new Map<string, { id: string }>();
  for (const category of categoryResult) {
    categoryLookup.set(category.name, category);
  }

  const products = seedData.products.items.map((item) => ({
    title: item.title,
    category_ids: [categoryLookup.get(item.category)!.id],
    description: item.description,
    handle: item.handle,
    weight: item.weight,
    status: item.status === "published" ? ProductStatus.PUBLISHED : ProductStatus.DRAFT,
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

export default async function initial_data_seed({
  container,
  data,
}: {
  container: MedusaContainer;
  data?: SeedData | string;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const seedData = await loadSeedData(data ?? undefined);

  const { defaultSalesChannel, region, shippingProfile } = await seedStoreData({
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

  logger.info("Finished seeding initial data from JSON.");
  return {
    seedData,
    region,
    defaultSalesChannel,
    shippingProfile,
  };
}
