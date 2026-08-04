#!/usr/bin/env node
/**
 * End-to-end smoke tests for the integrated dev stack.
 * Run after start.dev.ps1 / start.dev.sh when nginx is up on :8800.
 */
import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:8800"
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@medusa.local"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "supersecret123"

function loadEnv() {
  const envPath = resolve(ROOT, ".env.dev")
  const raw = readFileSync(envPath, "utf8")
  const get = (key) => {
    const line = raw.split("\n").find((l) => l.startsWith(`${key}=`))
    if (!line) throw new Error(`${key} missing in .env.dev`)
    return line.split("=", 2)[1].trim()
  }
  return {
    publishableKey: get("NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY"),
    regionId: get("NUXT_PUBLIC_MEDUSA_REGION_ID"),
  }
}

const { publishableKey: PK, regionId: REGION_ID } = loadEnv()
const storeHeaders = { "x-publishable-api-key": PK, "content-type": "application/json" }

const results = []
let adminToken = null

function pass(name, detail = "") {
  results.push({ name, ok: true, detail })
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`)
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail })
  console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`)
}

async function req(url, opts = {}) {
  const res = await fetch(url, opts)
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    /* html or plain */
  }
  return { status: res.status, text, json, headers: res.headers }
}

async function testHealth() {
  const r = await req(`${BASE}/health`)
  if (r.status === 200) pass("Health endpoint", String(r.status))
  else fail("Health endpoint", `status ${r.status}`)
}

async function testStoreBootstrap() {
  const r = await req(`${BASE}/store/storefront-bootstrap`, { headers: storeHeaders })
  if (r.status !== 200) return fail("Storefront bootstrap", `status ${r.status}`)
  const d = r.json
  if (!d?.settings && !d?.navigations) return fail("Storefront bootstrap", "missing settings/navigations")
  pass("Storefront bootstrap", `nav=${Array.isArray(d.navigations) ? d.navigations.length : "?"} items`)
}

async function testStoreNavigations() {
  const r = await req(`${BASE}/store/navigations`, { headers: storeHeaders })
  if (r.status !== 200) return fail("Store navigations", `status ${r.status}`)
  pass("Store navigations", `menu=${r.json?.menu?.slug ?? "none"}`)
}

async function testStoreProducts() {
  const r = await req(`${BASE}/store/products?limit=3&region_id=${REGION_ID}&fields=*variants,*variants.calculated_price,*variants.inventory_quantity`, {
    headers: storeHeaders,
  })
  if (r.status !== 200) return fail("Store products", `status ${r.status}`)
  const count = r.json?.products?.length ?? 0
  if (count === 0) return fail("Store products", "empty catalog")
  pass("Store products", `${count} products`)
  return r.json.products[0]
}

async function testVariantAvailability(product) {
  const variant = product?.variants?.[0]
  if (!variant?.id) return fail("Variant availability", "no variant on first product")
  const r = await req(`${BASE}/store/variants/${variant.id}/availability`, { headers: storeHeaders })
  if (r.status !== 200) return fail("Variant availability", `status ${r.status}`)
  pass("Variant availability", `ok=${r.json?.ok ?? "?"}`)
  return variant
}

async function testCartFlow(variant) {
  let r = await req(`${BASE}/store/carts`, {
    method: "POST",
    headers: storeHeaders,
    body: JSON.stringify({ region_id: REGION_ID }),
  })
  if (r.status !== 200) return fail("Create cart", `status ${r.status}`)
  const cartId = r.json?.cart?.id
  if (!cartId) return fail("Create cart", "no cart id")

  r = await req(`${BASE}/store/carts/${cartId}/line-items`, {
    method: "POST",
    headers: storeHeaders,
    body: JSON.stringify({ variant_id: variant.id, quantity: 1 }),
  })
  if (r.status !== 200) return fail("Add line item", `status ${r.status} ${r.text.slice(0, 120)}`)

  r = await req(`${BASE}/store/carts/${cartId}/validate-inventory`, {
    method: "POST",
    headers: storeHeaders,
    body: JSON.stringify({}),
  })
  if (r.status !== 200) return fail("Validate inventory", `status ${r.status} ${r.text.slice(0, 120)}`)
  pass("Cart create + add + validate inventory", cartId)
  return cartId
}

async function testAdminLogin() {
  const r = await req(`${BASE}/auth/user/emailpass`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  if (r.status !== 200) return fail("Admin login", `status ${r.status} ${r.text.slice(0, 120)}`)
  adminToken = r.json?.token
  if (!adminToken) return fail("Admin login", "no token")
  pass("Admin login")
}

async function testAdminInquiries() {
  if (!adminToken) return fail("Admin inquiries", "no admin token")
  const r = await req(`${BASE}/admin/inquiries?limit=1&offset=0`, {
    headers: { authorization: `Bearer ${adminToken}` },
  })
  if (r.status !== 200) return fail("Admin inquiries", `status ${r.status} ${r.text.slice(0, 120)}`)
  pass("Admin inquiries API", `count=${r.json?.count ?? "?"}`)
}

async function testStoreContact() {
  const r = await req(`${BASE}/store/contact`, {
    method: "POST",
    headers: storeHeaders,
    body: JSON.stringify({
      name: "E2E Test",
      email: "e2e@test.local",
      phone: "0900000000",
      message: `Smoke test ${Date.now()}`,
    }),
  })
  if (r.status !== 200 && r.status !== 201) return fail("Store contact", `status ${r.status} ${r.text.slice(0, 120)}`)
  pass("Store contact form")
}

async function testStorefrontPages() {
  const routes = ["/", "/san-pham-list", "/gio-hang", "/app"]
  for (const route of routes) {
    const r = await req(`${BASE}${route}`)
    if (r.status !== 200) fail(`Page ${route}`, `status ${r.status}`)
    else pass(`Page ${route}`, `${Math.round(r.text.length / 1024)}KB`)
  }
}

async function testOrderLookupRateLimit() {
  const r = await req(`${BASE}/store/order-lookup?display_id=999999&email=nobody@test.local`, {
    headers: storeHeaders,
  })
  if (r.status !== 404 && r.status !== 400 && r.status !== 200) {
    return fail("Order lookup", `unexpected status ${r.status}`)
  }
  pass("Order lookup", `status ${r.status}`)
}

async function main() {
  console.log(`\nE2E smoke tests — ${BASE}\n`)

  try {
    await testHealth()
    await testStoreBootstrap()
    await testStoreNavigations()
    const product = await testStoreProducts()
    const variant = await testVariantAvailability(product)
    await testCartFlow(variant)
    await testStoreContact()
    await testOrderLookupRateLimit()
    await testAdminLogin()
    await testAdminInquiries()
    await testStorefrontPages()
  } catch (err) {
    console.error("\nUnexpected error:", err)
    process.exit(1)
  }

  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} passed`)
  if (failed.length) {
    console.error("\nFailed:")
    for (const f of failed) console.error(`  - ${f.name}: ${f.detail}`)
    process.exit(1)
  }
  console.log("\nAll smoke tests passed.\n")
}

main()
