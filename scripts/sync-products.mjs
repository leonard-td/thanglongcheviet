#!/usr/bin/env node
/**
 * Upserts the product catalog in
 * apps/backend/src/migration-scripts/data/initial-data.json against a LIVE
 * Medusa instance's Admin REST API — safe to re-run, and works against ANY
 * environment (dev, prod, whatever) just by pointing MEDUSA_BACKEND_URL at
 * it. No docker exec / SSH / rebuild required.
 *
 * Complements apps/backend/src/migration-scripts/initial-data-seed.ts, which
 * only runs once at backend boot and has no existence checks (it assumes a
 * completely empty database). This script is the "already-running instance"
 * counterpart — same pattern as scripts/setup-web-integration.mjs for the
 * store/region/shipping side.
 *
 * Existing products are matched by handle: found -> update core fields +
 * each variant's sku/prices; not found -> create. Product categories are
 * matched by name and created if missing.
 *
 * Usage:
 *   node scripts/sync-products.mjs
 *   MEDUSA_BACKEND_URL=http://<prod-host>:8800 ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/sync-products.mjs
 */

import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL || `http://localhost:${process.env.HTTP_PORT || "8800"}`
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@medusa.local"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "supersecret123"
const DATA_PATH = path.resolve(
  __dirname,
  "..",
  "apps/backend/src/migration-scripts/data/initial-data.json",
)

function log(msg) {
  console.log(`[sync-products] ${msg}`)
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

async function adminFetch(token, p, options = {}) {
  const res = await fetch(`${BACKEND_URL}${p}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })
  if (!res.ok) throw new Error(`${options.method || "GET"} ${p} failed: ${res.status} ${await res.text()}`)
  return res.json()
}

async function ensureCategories(token, categories) {
  // Fetch + match client-side rather than relying on server-side ?name=
  // filtering behaving exactly as hoped — cheap at this catalog size.
  const { product_categories: existing } = await adminFetch(
    token,
    "/admin/product-categories?limit=100&fields=id,name",
  )
  const lookup = new Map()
  for (const cat of categories) {
    const found = existing.find((c) => c.name === cat.name)
    if (found) {
      lookup.set(cat.name, found)
      continue
    }
    const created = await adminFetch(token, "/admin/product-categories", {
      method: "POST",
      body: JSON.stringify({ name: cat.name, is_active: cat.is_active ?? true }),
    })
    log(`Created category "${cat.name}" (${created.product_category.id}).`)
    lookup.set(cat.name, created.product_category)
  }
  return lookup
}

async function ensureSalesChannel(token) {
  const { sales_channels } = await adminFetch(token, "/admin/sales-channels?limit=1")
  if (!sales_channels.length) {
    throw new Error(
      "No sales channel found on this instance — run provisioning/setup-web-integration.mjs first.",
    )
  }
  return sales_channels[0]
}

function buildOptionsForCreate(item) {
  return item.options.map((title) => ({
    title,
    values: [...new Set(item.variants.map((v) => v.options[title]).filter(Boolean))],
  }))
}

async function upsertProduct(token, item, categoryId, salesChannelId, existingByHandle) {
  const status = item.status === "published" ? "published" : "draft"
  const existing = existingByHandle.get(item.handle)

  if (!existing) {
    await adminFetch(token, "/admin/products", {
      method: "POST",
      body: JSON.stringify({
        title: item.title,
        handle: item.handle,
        description: item.description,
        status,
        weight: item.weight,
        category_ids: [categoryId],
        images: item.images,
        options: buildOptionsForCreate(item),
        variants: item.variants.map((v) => ({
          title: v.title,
          sku: v.sku,
          options: v.options,
          prices: v.prices,
        })),
        sales_channels: [{ id: salesChannelId }],
      }),
    })
    log(`Created product "${item.title}" (${item.handle}).`)
    return
  }

  await adminFetch(token, `/admin/products/${existing.id}`, {
    method: "POST",
    body: JSON.stringify({
      title: item.title,
      description: item.description,
      status,
      weight: item.weight,
      images: item.images,
      category_ids: [categoryId],
    }),
  })

  // Dedicated variant-update route — a partial {id, prices} entry inside the
  // top-level product's `variants` array needs a full variant payload and
  // 500s otherwise (same constraint worked around in setup-web-integration.mjs).
  for (const v of item.variants) {
    const match = existing.variants.find((ev) => ev.title === v.title)
    if (!match) {
      log(`  WARNING: variant "${v.title}" not found on existing product "${item.title}" — add it manually in the admin.`)
      continue
    }
    await adminFetch(token, `/admin/products/${existing.id}/variants/${match.id}`, {
      method: "POST",
      body: JSON.stringify({ sku: v.sku, prices: v.prices }),
    })
  }
  log(`Updated product "${item.title}" (${item.handle}).`)
}

async function main() {
  const data = JSON.parse(readFileSync(DATA_PATH, "utf8"))
  log(`Target: ${BACKEND_URL}`)

  const token = await adminLogin()
  const salesChannel = await ensureSalesChannel(token)
  const categoryLookup = await ensureCategories(token, data.products.categories)

  const { products: existingProducts } = await adminFetch(
    token,
    "/admin/products?limit=100&fields=id,handle,variants.id,variants.title",
  )
  const existingByHandle = new Map(existingProducts.map((p) => [p.handle, p]))

  for (const item of data.products.items) {
    const category = categoryLookup.get(item.category)
    if (!category) {
      throw new Error(`Product "${item.title}" references unknown category "${item.category}".`)
    }
    await upsertProduct(token, item, category.id, salesChannel.id, existingByHandle)
  }

  log(`Done — synced ${data.products.items.length} product(s) to ${BACKEND_URL}.`)
}

main().catch((err) => {
  console.error(`[sync-products] FAILED: ${err.message}`)
  process.exit(1)
})
