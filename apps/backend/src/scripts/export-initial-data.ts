import fs from "node:fs";
import path from "node:path";
import type { MedusaContainer } from "@medusajs/framework";
import type { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";
import { CARD_MODULE } from "../modules/card";
import { CAMPAIGN_MODULE } from "../modules/campaign";
import { NAVIGATION_MODULE } from "../modules/navigation";

type LoggerLike = {
  info: (message: string) => void;
  warn: (message: string) => void;
};

type SeedPayload = {
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

type ExportInput = {
  salesChannels?: Array<{ name?: string; description?: string }>;
  publishableApiKeys?: Array<{ title?: string; type?: string; created_by?: string }>;
  stores?: Array<{
    name?: string;
    supported_currencies?: Array<{ currency_code?: string; is_default?: boolean }>;
  }>;
  regions?: Array<{
    name?: string;
    currency_code?: string;
    countries?: string[];
    payment_providers?: string[];
  }>;
  stockLocations?: Array<{
    name?: string;
    address?: { city?: string; country_code?: string; address_1?: string };
  }>;
  fulfillmentSets?: Array<{
    name?: string;
    type?: string;
    service_zones?: Array<{
      name?: string;
      geo_zones?: Array<{ country_code?: string; type?: string }>;
    }>;
  }>;
  shippingOptions?: Array<{
    name?: string;
    price_type?: string;
    provider_id?: string;
    type?: { label?: string; description?: string; code?: string };
    prices?: Array<{ currency_code?: string; region_id?: string; amount?: number }>;
    rules?: Array<{ attribute?: string; value?: string; operator?: string }>;
  }>;
  productCategories?: Array<{ name?: string; is_active?: boolean }>;
  productOptions?: Array<{ title?: string; values?: Array<{ value?: string }> | string[] }>;
  products?: Array<{
    title?: string;
    description?: string;
    handle?: string;
    weight?: number;
    status?: string;
    categories?: Array<{ name?: string }>;
    images?: Array<{ url?: string }>;
    options?: Array<{ title?: string; values?: Array<{ value?: string }> | string[] }>;
    variants?: Array<{
      title?: string;
      sku?: string;
      options?: Array<{ option_title?: string; value?: string }> | Record<string, string>;
      prices?: Array<{ amount?: number; currency_code?: string }>;
    }>;
  }>;
  cards?: Array<{
    title?: Record<string, string> | null;
    path?: string | null;
    image?: string | null;
    type?: string;
    rank?: number;
    is_active?: boolean;
    locked?: boolean;
  }>;
  campaignTopics?: Array<{
    name?: string;
    slug?: string;
    description?: string | null;
    rank?: number;
    content_type?: string;
  }>;
  campaignPosts?: Array<{
    title?: string;
    slug?: string;
    description?: string | null;
    is_active?: boolean;
    publish_at?: Date | null;
    unpublish_at?: Date | null;
    content?: unknown;
    topic_id?: string | null;
    topic_slug?: string;
  }>;
  navigationMenus?: Array<{ id?: string; name?: string; slug?: string; is_active?: boolean }>;
  navigationItems?: Array<{
    id?: string;
    menu_id?: string;
    label?: string;
    url?: string;
    order?: number;
    parent_id?: string | null;
    is_active?: boolean;
    openInNewTab?: boolean;
  }>;
};

function normalizeOptionValues(values?: Array<{ value?: string }> | string[]): string[] {
  if (!values) return [];
  if (Array.isArray(values)) {
    return values.map((value) => {
      if (typeof value === "string") return value;
      return value?.value ?? "";
    }).filter(Boolean);
  }
  return [];
}

function toRecordOptions(options?: Array<{ option_title?: string; value?: string }> | Record<string, string>): Record<string, string> {
  if (!options) return {};
  if (Array.isArray(options)) {
    return Object.fromEntries(
      options
        .map((option) => [option.option_title ?? "", option.value ?? ""])
        .filter(([key]) => Boolean(key))
    );
  }
  return options;
}

export function buildInitialDataPayload(input: ExportInput): SeedPayload {
  const salesChannel = input.salesChannels?.[0];
  const publishableApiKey = input.publishableApiKeys?.[0];
  const store = input.stores?.[0];
  const region = input.regions?.[0];
  const stockLocation = input.stockLocations?.[0];
  const fulfillmentSet = input.fulfillmentSets?.[0];
  const shippingOption = input.shippingOptions?.[0];

  const productCategories = (input.productCategories ?? []).map((category) => ({
    name: category.name ?? "",
    is_active: Boolean(category.is_active),
  }));

  const productOptions = (input.productOptions ?? []).map((option) => ({
    title: option.title ?? "",
    values: normalizeOptionValues(option.values),
  }));

  const products = (input.products ?? []).map((product) => ({
    title: product.title ?? "",
    category: product.categories?.[0]?.name ?? "",
    description: product.description ?? "",
    handle: product.handle ?? "",
    weight: product.weight ?? 0,
    status: (product.status ?? "draft").toLowerCase(),
    images: (product.images ?? []).map((image) => ({ url: image.url ?? "" })),
    options: (product.options ?? []).map((option) => option.title ?? ""),
    variants: (product.variants ?? []).map((variant) => ({
      title: variant.title ?? "",
      sku: variant.sku ?? "",
      options: toRecordOptions(variant.options),
      prices: (variant.prices ?? []).map((price) => ({
        amount: price.amount ?? 0,
        currency_code: price.currency_code ?? "usd",
      })),
    })),
  }));

  const cards = (input.cards ?? []).map((card) => ({
    title: card.title ?? null,
    path: card.path ?? null,
    image: card.image ?? null,
    type: card.type ?? "link",
    rank: card.rank ?? 0,
    is_active: Boolean(card.is_active),
    locked: Boolean(card.locked),
  }));

  const campaignTopics = (input.campaignTopics ?? []).map((topic) => ({
    name: topic.name ?? "",
    slug: topic.slug ?? "",
    description: topic.description ?? null,
    rank: topic.rank ?? 0,
    content_type: topic.content_type ?? "post",
  }));

  const campaignPosts = (input.campaignPosts ?? []).map((post) => ({
    title: post.title ?? "",
    slug: post.slug ?? "",
    description: post.description ?? null,
    is_active: Boolean(post.is_active),
    publish_at: post.publish_at ?? null,
    unpublish_at: post.unpublish_at ?? null,
    content: post.content ?? {},
    topic_slug: post.topic_slug ?? undefined,
  }));

  const menu = input.navigationMenus?.[0];
  const treeItems = (input.navigationItems ?? []).filter((item) => !item.parent_id);
  const tree = treeItems.map((item) => ({
    label: item.label ?? "",
    url: item.url ?? "",
    children: (input.navigationItems ?? [])
      .filter((child) => child.parent_id === item.id)
      .map((child) => ({ label: child.label ?? "", url: child.url ?? "" })),
  }));

  return {
    store: {
      sales_channel: {
        name: salesChannel?.name ?? "Default Sales Channel",
        description: salesChannel?.description ?? "Exported from database",
      },
      publishable_api_key: {
        title: publishableApiKey?.title ?? "Default Publishable API Key",
        type: publishableApiKey?.type ?? "publishable",
        created_by: publishableApiKey?.created_by ?? "",
      },
      store: {
        name: store?.name ?? "Default Store",
        supported_currencies: (store?.supported_currencies ?? []).map((currency) => ({
          currency_code: currency.currency_code ?? "usd",
          is_default: Boolean(currency.is_default),
        })),
      },
    },
    region: {
      name: region?.name ?? "Europe",
      currency_code: region?.currency_code ?? "eur",
      countries: region?.countries ?? [],
      payment_providers: region?.payment_providers ?? [],
    },
    stock_location: {
      name: stockLocation?.name ?? "Default Stock Location",
      address: {
        city: stockLocation?.address?.city ?? "",
        country_code: stockLocation?.address?.country_code ?? "",
        address_1: stockLocation?.address?.address_1 ?? "",
      },
    },
    fulfillment: {
      name: fulfillmentSet?.name ?? "Default Fulfillment Set",
      type: fulfillmentSet?.type ?? "shipping",
      service_zones: (fulfillmentSet?.service_zones ?? []).map((zone) => ({
        name: zone.name ?? "",
        geo_zones: (zone.geo_zones ?? []).map((geoZone) => ({
          country_code: geoZone.country_code ?? "",
          type: geoZone.type ?? "country",
        })),
      })),
      shipping_options: (input.shippingOptions ?? []).map((option) => ({
        name: option.name ?? "",
        price_type: option.price_type ?? "flat",
        provider_id: option.provider_id ?? "manual_manual",
        type: {
          label: option.type?.label ?? "",
          description: option.type?.description ?? "",
          code: option.type?.code ?? "",
        },
        prices: (option.prices ?? []).map((price) => ({
          currency_code: price.currency_code,
          region_id: price.region_id,
          amount: price.amount ?? 0,
        })),
        rules: (option.rules ?? []).map((rule) => ({
          attribute: rule.attribute ?? "",
          value: rule.value ?? "",
          operator: rule.operator ?? "eq",
        })),
      })),
    },
    products: {
      categories: productCategories,
      options: productOptions,
      items: products,
    },
    content: {
      cards,
      campaign_topics: campaignTopics,
      campaign_posts: campaignPosts,
      navigation: {
        menu: {
          id: menu?.id ?? "navm_storefront_header",
          name: menu?.name ?? "Storefront Header",
          slug: menu?.slug ?? "storefront-header",
        },
        tree,
      },
    },
  };
}

async function readGraphData(query: any, entity: string, fields: string[]) {
  try {
    const { data } = await query.graph({ entity, fields });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

/**
 * Reads every entity `buildInitialDataPayload` needs, straight off the
 * container. Shared by the CLI entrypoint below and by the admin
 * Backup & Restore "seed data" export, so both stay backed by the exact
 * same query logic.
 */
export async function collectInitialDataInput(
  container: MedusaContainer
): Promise<ExportInput> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as any;
  const productModule = container.resolve(Modules.PRODUCT) as any;
  const cardModule = container.resolve(CARD_MODULE) as any;
  const campaignModule = container.resolve(CAMPAIGN_MODULE) as any;
  const navigationModule = container.resolve(NAVIGATION_MODULE) as any;

  const salesChannels = await readGraphData(query, "sales_channel", ["id", "name", "description"]);
  const publishableApiKeys = await readGraphData(query, "api_key", ["id", "title", "type", "created_by"]);
  const stores = await readGraphData(query, "store", ["id", "name", "supported_currencies", "default_sales_channel_id"]);
  const regions = await readGraphData(query, "region", ["id", "name", "currency_code", "countries", "payment_providers"]);
  const stockLocations = await readGraphData(query, "stock_location", ["id", "name", "address"]);
  const fulfillmentSets = await readGraphData(query, "fulfillment_set", ["id", "name", "type", "service_zones"]);
  const shippingOptions = await readGraphData(query, "shipping_option", ["id", "name", "price_type", "provider_id", "type", "prices", "rules"]);

  const productCategories = await productModule.listProductCategories({}, { take: 2000 });
  const productOptions = await productModule.listProductOptions({}, { take: 2000 });
  const products = await productModule.listProducts({}, { take: 2000 });

  const cards = await cardModule.listCards({}, { take: 2000 });
  const campaignTopics = await campaignModule.listCampaignTopics({}, { take: 2000 });
  const campaignPosts = await campaignModule.listCampaignPosts({}, { take: 2000 });

  const [menus] = await navigationModule.listAndCountNavigationMenus({}, { take: 1000 });
  const menu = menus?.[0] ?? null;
  const navigationItems = menu
    ? await navigationModule.listItemsByMenu(menu.id)
    : [];

  return {
    salesChannels,
    publishableApiKeys,
    stores,
    regions,
    stockLocations,
    fulfillmentSets,
    shippingOptions,
    productCategories,
    productOptions,
    products,
    cards,
    campaignTopics,
    campaignPosts,
    navigationMenus: menus ?? [],
    navigationItems,
  };
}

export default async function exportInitialData({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as LoggerLike;

  const outputPath = args[0]
    ? path.resolve(process.cwd(), args[0])
    : path.resolve(process.cwd(), "src/migration-scripts/data/initial-data.exported.json");

  logger.info(`export-initial-data: collecting data from the database...`);

  const input = await collectInitialDataInput(container);
  const payload = buildInitialDataPayload(input);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  logger.info(`export-initial-data: wrote ${outputPath}`);
}
