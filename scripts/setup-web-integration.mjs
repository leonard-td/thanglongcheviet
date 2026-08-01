#!/usr/bin/env node
/**
 * Idempotent one-shot setup that lets apps/web (Nuxt) talk to this Medusa
 * backend's Store API without any manual dashboard clicking. Works against a
 * COMPLETELY EMPTY database (fresh `medusa db:migrate`) as well as an
 * already-provisioned one — anything missing is created, anything present is
 * left alone:
 *
 *   1. Waits for the backend to be healthy.
 *   2. Logs in as the admin user created by run-dev.sh/ps1 or docker-compose.
 *   3. Ensures VND is a supported store currency (a VND region can't be
 *      created otherwise) and a default sales channel exists.
 *   4. Ensures a "Vietnam" region exists (VND, country vn, system payment).
 *   5. Ensures a stock location exists (created on an empty DB) with the
 *      manual fulfillment provider + sales-channel link, a fulfillment set
 *      with a "Vietnam" service zone, a shipping profile, and a flat VN
 *      shipping option.
 *   6. Backfills a VND price (derived from the existing EUR price) onto
 *      every product variant that doesn't have one yet — a no-op when the
 *      catalog is empty.
 *   7. Ensures a publishable API key exists AND is linked to the default
 *      sales channel (the Store API rejects unlinked keys), then reads it.
 *   8. Writes/updates the repo-root compose env file (.env.dev by default,
 *      override with ENV_FILE=.env.prod) with NUXT_PUBLIC_MEDUSA_* values —
 *      docker compose passes them through to the `web` service.
 *
 * apps/backend/src/scripts/seed-base.ts seeds the same base data at backend
 * boot; this script is the API-side counterpart so it also works standalone
 * against a remote backend.
 *
 * Usage:  node scripts/setup-web-integration.mjs
 *         ENV_FILE=.env.prod MEDUSA_BACKEND_URL=http://<domain>:<port> node scripts/setup-web-integration.mjs
 * Safe to re-run — every step checks for existing state first.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Default to the nginx entrypoint — the backend's own :9000 is not published.
// For a non-localhost deployment, pass MEDUSA_BACKEND_URL explicitly (see
// usage below) instead of relying on a DOMAIN env var.
const BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL || `http://localhost:${process.env.HTTP_PORT || "8800"}`
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@medusa.local"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "supersecret123"
// Repo-root compose env file — the single source of truth the start scripts
// pass to docker compose (apps/web no longer keeps its own .env).
const ENV_FILE_PATH = path.resolve(__dirname, "..", process.env.ENV_FILE || ".env.dev")
const VND_PER_EUR = 27000 // rough demo conversion, not a live FX rate

function log(msg) {
  console.log(`[setup-web-integration] ${msg}`)
}

async function waitForHealth() {
  log("Waiting for backend health...")
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${BACKEND_URL}/health`)
      if (res.ok) {
        log("Backend is healthy.")
        return
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 2000))
  }
  throw new Error("Backend did not become healthy in time.")
}

async function adminLogin() {
  const res = await fetch(`${BACKEND_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  if (!res.ok) throw new Error(`Admin login failed: ${res.status} ${await res.text()}`)
  const { token } = await res.json()
  return token
}

async function adminFetch(token, path, options = {}) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })
  if (!res.ok) throw new Error(`${options.method || "GET"} ${path} failed: ${res.status} ${await res.text()}`)
  return res.json()
}

async function ensureStoreDefaults(token) {
  // vnd must be in the store's supported currencies BEFORE a VND region can
  // be created — on an empty DB it never is.
  const { stores } = await adminFetch(token, "/admin/stores?limit=1&fields=id,*supported_currencies")
  const store = stores[0]
  if (!store) throw new Error("No store found — did `medusa db:migrate` run?")
  const supported = store.supported_currencies || []
  if (supported.some((c) => c.currency_code === "vnd")) {
    log("Store already supports VND.")
    return store
  }
  // Preserve whatever currencies/default the store already has; vnd only
  // becomes the default when nothing else is.
  const merged = [
    ...supported.map((c) => ({ currency_code: c.currency_code, is_default: !!c.is_default })),
    { currency_code: "vnd", is_default: !supported.some((c) => c.is_default) },
  ]
  await adminFetch(token, `/admin/stores/${store.id}`, {
    method: "POST",
    body: JSON.stringify({ supported_currencies: merged }),
  })
  log("Added VND to the store's supported currencies.")
  return store
}

async function ensureDefaultSalesChannel(token) {
  const { sales_channels } = await adminFetch(token, "/admin/sales-channels?limit=1")
  if (sales_channels.length) {
    log(`Sales channel already exists (${sales_channels[0].id}).`)
    return sales_channels[0]
  }
  const { sales_channel } = await adminFetch(token, "/admin/sales-channels", {
    method: "POST",
    body: JSON.stringify({ name: "Default Sales Channel" }),
  })
  log(`Created Default Sales Channel (${sales_channel.id}).`)
  return sales_channel
}

async function ensureVietnamRegion(token) {
  log("Ensuring Vietnam region (VND) exists...")
  const { regions } = await adminFetch(token, "/admin/regions?limit=100")
  const existing = regions.find((r) => r.name === "Vietnam")
  if (existing) {
    log(`Vietnam region already exists (${existing.id}).`)
    return existing
  }
  const { region } = await adminFetch(token, "/admin/regions", {
    method: "POST",
    body: JSON.stringify({
      name: "Vietnam",
      currency_code: "vnd",
      countries: ["vn"],
      payment_providers: ["pp_system_default"],
    }),
  })
  log(`Created Vietnam region (${region.id}).`)
  return region
}

async function ensureVietnamShipping(token, salesChannel) {
  log("Ensuring stock location + Vietnam shipping option exist...")
  // There's no GET /admin/fulfillment-sets/:id route — fetch the nested
  // fulfillment set + service zones through the stock location instead.
  const LOCATION_FIELDS =
    "fields=id,name,*fulfillment_providers,*sales_channels,*fulfillment_sets.service_zones"
  const { stock_locations } = await adminFetch(
    token,
    `/admin/stock-locations?limit=1&${LOCATION_FIELDS}`,
  )
  let location = stock_locations[0]
  if (!location) {
    // Empty DB: no seeded warehouse exists. Create one so shipping has a home.
    const created = await adminFetch(token, "/admin/stock-locations", {
      method: "POST",
      body: JSON.stringify({
        name: "Kho mặc định",
        address: { city: "Hà Nội", country_code: "VN", address_1: "" },
      }),
    })
    location = created.stock_location
    log(`Created stock location (${location.id}).`)
  }

  if (!location.fulfillment_providers?.length) {
    await adminFetch(token, `/admin/stock-locations/${location.id}/fulfillment-providers`, {
      method: "POST",
      body: JSON.stringify({ add: ["manual_manual"] }),
    })
    log("Enabled manual fulfillment provider on the stock location.")
  }

  if (!(location.sales_channels || []).some((sc) => sc.id === salesChannel.id)) {
    await adminFetch(token, `/admin/stock-locations/${location.id}/sales-channels`, {
      method: "POST",
      body: JSON.stringify({ add: [salesChannel.id] }),
    })
    log("Linked stock location to the default sales channel.")
  }

  let fulfillmentSet = location.fulfillment_sets?.[0]
  if (!fulfillmentSet) {
    await adminFetch(token, `/admin/stock-locations/${location.id}/fulfillment-sets`, {
      method: "POST",
      body: JSON.stringify({ name: "Giao hàng Việt Nam", type: "shipping" }),
    })
    // Refetch — the create response doesn't reliably include the nested zones.
    const refreshed = await adminFetch(
      token,
      `/admin/stock-locations/${location.id}?${LOCATION_FIELDS}`,
    )
    fulfillmentSet = refreshed.stock_location.fulfillment_sets?.[0]
    if (!fulfillmentSet) throw new Error("Fulfillment set creation did not stick.")
    log(`Created fulfillment set (${fulfillmentSet.id}).`)
  }

  let serviceZone = (fulfillmentSet.service_zones || []).find((z) => z.name === "Vietnam")
  if (!serviceZone) {
    const created = await adminFetch(
      token,
      `/admin/fulfillment-sets/${fulfillmentSet.id}/service-zones`,
      {
        method: "POST",
        body: JSON.stringify({
          name: "Vietnam",
          geo_zones: [{ country_code: "vn", type: "country" }],
        }),
      },
    )
    serviceZone = created.fulfillment_set.service_zones.find((z) => z.name === "Vietnam")
    log(`Created "Vietnam" service zone (${serviceZone.id}).`)
  } else {
    log(`"Vietnam" service zone already exists (${serviceZone.id}).`)
  }

  const { shipping_options } = await adminFetch(
    token,
    `/admin/shipping-options?service_zone_id=${serviceZone.id}`,
  )
  if (shipping_options.length) {
    log(`Vietnam shipping option already exists (${shipping_options[0].id}).`)
    return
  }

  // Fetch the shipping profile directly (the old "reuse from any existing
  // shipping option" trick has nothing to reuse on an empty DB).
  const { shipping_profiles } = await adminFetch(token, "/admin/shipping-profiles?limit=1")
  let shippingProfileId = shipping_profiles[0]?.id
  if (!shippingProfileId) {
    const created = await adminFetch(token, "/admin/shipping-profiles", {
      method: "POST",
      body: JSON.stringify({ name: "Default Shipping Profile", type: "default" }),
    })
    shippingProfileId = created.shipping_profile.id
    log("Created default shipping profile.")
  }

  await adminFetch(token, "/admin/shipping-options", {
    method: "POST",
    body: JSON.stringify({
      name: "Giao hàng tiêu chuẩn",
      service_zone_id: serviceZone.id,
      shipping_profile_id: shippingProfileId,
      provider_id: "manual_manual",
      price_type: "flat",
      type: { label: "Standard", description: "Giao trong 2-3 ngày", code: "standard" },
      prices: [{ currency_code: "vnd", amount: 30000 }],
      rules: [
        { attribute: "enabled_in_store", operator: "eq", value: "true" },
        { attribute: "is_return", operator: "eq", value: "false" },
      ],
    }),
  })
  log("Created Vietnam shipping option (30,000₫ flat).")
}

async function backfillVndPrices(token) {
  log("Backfilling VND prices on product variants missing one...")
  const { products } = await adminFetch(
    token,
    "/admin/products?limit=100&fields=id,*variants.prices",
  )
  let updated = 0
  for (const product of products) {
    for (const variant of product.variants || []) {
      const hasVnd = variant.prices?.some((p) => p.currency_code === "vnd")
      if (hasVnd) continue
      const eurPrice = variant.prices?.find((p) => p.currency_code === "eur")
      const amount = eurPrice ? Math.round(eurPrice.amount * VND_PER_EUR) : 100000
      // Dedicated variant-update route — the top-level POST /admin/products/:id
      // with a nested `variants` array requires a FULL variant payload (title
      // etc.) and 500s on a partial {id, prices} patch.
      await adminFetch(token, `/admin/products/${product.id}/variants/${variant.id}`, {
        method: "POST",
        body: JSON.stringify({ prices: [{ currency_code: "vnd", amount }] }),
      })
      updated++
    }
  }
  log(updated ? `Added VND price to ${updated} variant(s).` : "All variants already have VND prices.")
}

async function ensurePublishableKey(token, salesChannel) {
  const { api_keys } = await adminFetch(token, "/admin/api-keys?type=publishable&limit=1")
  let key = api_keys[0]
  if (!key) {
    const created = await adminFetch(token, "/admin/api-keys", {
      method: "POST",
      body: JSON.stringify({ title: "Webshop", type: "publishable" }),
    })
    key = created.api_key
    log(`Created publishable API key (${key.id}).`)
  }
  // The key only authorizes Store API calls for sales channels linked to it —
  // an unlinked key is as useless as no key. The batch-add endpoint may error
  // when the channel is already linked, so tolerate exactly that.
  try {
    await adminFetch(token, `/admin/api-keys/${key.id}/sales-channels`, {
      method: "POST",
      body: JSON.stringify({ add: [salesChannel.id] }),
    })
    log("Linked publishable key to the default sales channel.")
  } catch (err) {
    if (!/exist|already|duplicate/i.test(String(err.message))) throw err
    log("Publishable key already linked to the sales channel.")
  }
  return key.token
}

/**
 * Seeds default storefront navigation items when the menu is empty.
 * Safe to re-run — skips seeding when items already exist.
 */
async function ensureNavigation(token) {
  const NAV_API_BASE = "/admin/navigations"
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }

  let list = []
  try {
    const res = await fetch(`${BACKEND_URL}${NAV_API_BASE}`, { headers })
    if (res.ok) {
      const data = await res.json()
      list = Array.isArray(data) ? data : (data.navigations || [])
    }
  } catch (e) {
    log(`Could not list navigations: ${e.message}`)
    return
  }

  if (list.length > 0) {
    log(`Navigation already has ${list.length} item(s), skipping seed.`)
    return
  }

  const DEFAULT_ITEMS = [
    { label: "Trang ch\u1ee7", url: "/", order: 0 },
    {
      label: "S\u1ea3n ph\u1ea9m",
      url: "/san-pham-list",
      order: 1,
      children: [
        { label: "Tr\u00e0 Vi\u1ec7t", url: "/san-pham-list", order: 0 },
        { label: "An Quang Caff\u00e9", url: "/an-quang-caffe", order: 1 },
        {
          label: "Qu\u00e0 t\u1eb7ng doanh nghi\u1ec7p",
          url: "/qua-tang-doanh-nghiep",
          order: 2,
        },
      ],
    },
    {
      label: "D\u1ef1 \u00e1n & \u0110\u1ed1i t\u00e1c",
      url: "/du-an-doi-tac",
      order: 2,
    },
    { label: "S\u1ef1 ki\u1ec7n", url: "/trai-nghiem", order: 3 },
    {
      label: "Tin t\u1ee9c",
      url: "/tin-tuc",
      order: 4,
      children: [
        { label: "N\u1ebfp Tr\u00e0 Vi\u1ec7t", url: "/nep-tra-viet", order: 0 },
        { label: "V\u0103n ho\u00e1 Vi\u1ec7t", url: "/van-hoa-viet", order: 1 },
        { label: "Di s\u1ea3n tr\u00e0 c\u0169", url: "/di-san-tra-cu", order: 2 },
        { label: "V\u01b0\u1eddn An Quang", url: "/vuon-an-quang", order: 3 },
      ],
    },
    { label: "Th\u01b0 vi\u1ec7n v\u0103n ho\u00e1", url: "/thu-vien-van-hoa", order: 5 },
    { label: "Li\u00ean h\u1ec7", url: "/lien-he", order: 6 },
  ]

  async function createItem(item, parentId = null) {
    const res = await fetch(`${BACKEND_URL}${NAV_API_BASE}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        label: item.label,
        url: item.url,
        order: item.order,
        parent_id: parentId,
        openInNewTab: false,
        is_active: true,
      }),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Could not create "${item.label}" (${res.status}): ${text}`)
    }
    const data = await res.json()
    return data.navigation?.id ?? data.id
  }

  try {
    let created = 0
    for (const item of DEFAULT_ITEMS) {
      const parentId = await createItem(item)
      created += 1
      for (const child of item.children ?? []) {
        await createItem(child, parentId)
        created += 1
      }
    }
    log(`Seeded ${created} navigation item(s).`)
  } catch (e) {
    log(`Warning: Navigation seed failed: ${e.message}`)
  }
}


function upsertEnvVars(filePath, vars) {
  let content = existsSync(filePath) ? readFileSync(filePath, "utf8") : ""
  for (const [key, value] of Object.entries(vars)) {
    const line = `${key}=${value}`
    const re = new RegExp(`^${key}=.*$`, "m")
    if (re.test(content)) {
      content = content.replace(re, line)
    } else {
      content = content.trimEnd() + `\n${line}\n`
    }
  }
  writeFileSync(filePath, content)
}

async function main() {
  await waitForHealth()
  const token = await adminLogin()
  await ensureStoreDefaults(token)
  const salesChannel = await ensureDefaultSalesChannel(token)
  const region = await ensureVietnamRegion(token)
  await ensureVietnamShipping(token, salesChannel)
  await backfillVndPrices(token)
  const publishableKey = await ensurePublishableKey(token, salesChannel)
  await ensureNavigation(token)

  // NUXT_PUBLIC_MEDUSA_BACKEND_URL intentionally not written: compose derives
  // it from DOMAIN + HTTP_PORT already.
  const envVars = {
    NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: publishableKey,
    NUXT_PUBLIC_MEDUSA_REGION_ID: region.id,
  }
  upsertEnvVars(ENV_FILE_PATH, envVars)
  log(`Wrote Medusa env vars to ${ENV_FILE_PATH}`)
  log("Done. Re-run docker compose up -d (or the start script) so the web service picks them up.")
}

main().catch((err) => {
  console.error(`[setup-web-integration] FAILED: ${err.message}`)
  process.exit(1)
})
