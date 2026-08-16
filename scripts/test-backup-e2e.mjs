#!/usr/bin/env node
/**
 * E2E integration test: backup includes media, restore round-trips DB + static,
 * site-settings survives restore, storefront regressions stay green.
 *
 * Usage:
 *   node scripts/test-backup-e2e.mjs
 *   BASE_URL=http://localhost:8800 node scripts/test-backup-e2e.mjs
 */
import { readFileSync, existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { execSync } from "node:child_process"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE = (process.env.BASE_URL || "http://localhost:8800").replace(/\/$/, "")
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@medusa.local"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "supersecret123"
const POLL_MS = 1500
const JOB_TIMEOUT_MS = 120000

const results = []

function ok(name, detail = "") {
  results.push({ name, pass: true, detail })
  console.log(`PASS: ${name}${detail ? ` — ${detail}` : ""}`)
}

function fail(name, detail = "") {
  results.push({ name, pass: false, detail })
  console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ""}`)
}

function readEnvPublishableKey() {
  for (const envFile of [".env.prod", ".env.dev"]) {
    const p = path.resolve(__dirname, "..", envFile)
    if (!existsSync(p)) continue
    const m = readFileSync(p, "utf8").match(
      /^NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=(.+)$/m
    )
    if (m?.[1]) return m[1].trim()
  }
  return process.env.NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""
}

async function fetchJson(urlPath, init = {}) {
  const res = await fetch(`${BASE}${urlPath}`, init)
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = { raw: text.slice(0, 500) }
  }
  return { status: res.status, json, text }
}

async function adminLogin() {
  const { status, json } = await fetchJson("/auth/user/emailpass", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  if (status !== 200 || !json.token) {
    throw new Error(`admin login failed: ${status} ${JSON.stringify(json)}`)
  }
  return json.token
}

function adminHeaders(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }
}

async function waitForJob(token, expectType) {
  const deadline = Date.now() + JOB_TIMEOUT_MS
  while (Date.now() < deadline) {
    const { status, json } = await fetchJson("/admin/backup", {
      headers: adminHeaders(token),
    })
    if (status !== 200) throw new Error(`GET /admin/backup → ${status}`)
    const job = json.job
    if (!job || job.type !== expectType) {
      await sleep(POLL_MS)
      continue
    }
    if (job.status === "completed") return job
    if (job.status === "failed") {
      throw new Error(`${expectType} job failed: ${job.error || "unknown"}`)
    }
    await sleep(POLL_MS)
  }
  throw new Error(`${expectType} job timed out after ${JOB_TIMEOUT_MS}ms`)
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function inspectZip(zipPath) {
  const pyScript = path.resolve(__dirname, "tmp-inspect-backup.py")
  const out = execSync(`python3 ${JSON.stringify(pyScript)} ${JSON.stringify(zipPath)}`, {
    encoding: "utf8",
  }).trim()
  return JSON.parse(out)
}

function resolveBackupPath(fileName) {
  const candidates = [
    path.resolve(
      process.env.BACKUP_DIR || "",
      fileName
    ),
    path.resolve(
      process.env.HOME || "",
      "thanglongcheviet-native/apps/backend/.medusa/server/.backups",
      fileName
    ),
    path.resolve(__dirname, "../apps/backend/.backups", fileName),
    path.resolve(
      __dirname,
      "../apps/backend/.medusa/server/.backups",
      fileName
    ),
  ].filter(Boolean)
  for (const p of candidates) {
    if (p && existsSync(p)) return p
  }
  return null
}

async function storeGet(pathSuffix, pk) {
  return fetchJson(pathSuffix, {
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": pk,
    },
  })
}

async function checkHttp200(label, urlPath) {
  const { status } = await fetchJson(urlPath)
  if (status === 200) {
    ok(label, String(status))
    return true
  }
  fail(label, `HTTP ${status}`)
  return false
}

async function main() {
  console.log(`\n=== Backup E2E integration test @ ${BASE} ===\n`)

  // Health
  const health = await fetchJson("/health")
  if (health.status === 200) ok("backend health")
  else fail("backend health", String(health.status))

  const token = await adminLogin()
  ok("admin login", ADMIN_EMAIL)

  // Always resolve publishable key from admin — env files may be stale vs running stack
  const keys = await fetchJson("/admin/api-keys?limit=20&type=publishable", {
    headers: adminHeaders(token),
  })
  let pk =
    keys.json.api_keys?.find((k) => k.token)?.token ||
    readEnvPublishableKey()
  if (pk) ok("publishable key resolved", `${pk.slice(0, 10)}…`)
  else fail("publishable key resolved", "missing")

  // --- Baseline regression (storefront + store API) ---
  const baselinePages = [
    ["/", "storefront home"],
    ["/san-pham-list", "product list"],
    ["/bai-viet", "blog index"],
    ["/bai-viet/welcome-to-our-store", "blog post"],
    ["/trai-nghiem", "events index"],
    ["/lien-he", "contact"],
    ["/gioi-thieu", "about"],
    ["/app", "admin shell"],
  ]
  for (const [p, label] of baselinePages) {
    await checkHttp200(label, p)
  }

  const productsBefore = await storeGet(
    "/store/products?limit=100&fields=id,title,thumbnail",
    pk
  )
  if (productsBefore.status === 200 && productsBefore.json.products?.length) {
    ok(
      "store products API",
      `${productsBefore.json.products.length} products`
    )
  } else {
    fail("store products API", String(productsBefore.status))
  }

  const settingsBefore = await storeGet("/store/site-settings", pk)
  if (settingsBefore.status === 200) {
    ok("store site-settings API (baseline)")
  } else {
    fail(
      "store site-settings API (baseline)",
      `${settingsBefore.status} ${JSON.stringify(settingsBefore.json)}`
    )
  }

  const cards = await storeGet("/store/cards", pk)
  if (cards.status === 200) ok("store cards API")
  else fail("store cards API", String(cards.status))

  const nav = await storeGet("/store/navigations", pk)
  if (nav.status === 200) ok("store navigations API")
  else fail("store navigations API", String(nav.status))

  const posts = await storeGet("/store/campaign-posts?limit=10", pk)
  if (posts.status === 200) ok("store campaign-posts API")
  else fail("store campaign-posts API", String(posts.status))

  const sampleThumb =
    productsBefore.json.products?.find((p) => p.thumbnail)?.thumbnail || ""
  let sampleStaticPath = ""
  if (sampleThumb.startsWith("/static/")) {
    sampleStaticPath = sampleThumb
    const img = await fetchJson(sampleStaticPath)
    if (img.status === 200) {
      ok("product static image (baseline)", sampleStaticPath)
    } else {
      // Runtime static may be empty before first restore — not fatal if backup includes media
      console.log(
        `WARN: product static image (baseline) ${sampleStaticPath} → ${img.status} (may fix after restore)`
      )
    }
  } else {
    fail("product static image (baseline)", "no /static/ thumbnail on products")
  }

  // --- Record baseline store name (value that backup will capture) ---
  const adminSettings = await fetchJson("/admin/site-settings", {
    headers: adminHeaders(token),
  })
  const storeNameAtBackup =
    adminSettings.json.site_settings?.store_name ?? null
  const cleanupStoreName =
    storeNameAtBackup || "Thăng Long Chè Việt"

  // --- Create backup (captures current DB + media) ---
  const createRes = await fetchJson("/admin/backup", {
    method: "POST",
    headers: adminHeaders(token),
  })
  if (createRes.status !== 202) {
    fail("POST /admin/backup", String(createRes.status))
    process.exit(1)
  }
  ok("POST /admin/backup", "202 accepted")

  const backupJob = await waitForJob(token, "backup")
  const backupFile = backupJob.result?.file_name
  if (!backupFile) fail("backup job result", "missing file_name")
  else ok("backup job completed", backupFile)

  const zipPath = resolveBackupPath(backupFile)
  if (!zipPath) {
    fail("locate backup zip on disk", backupFile)
  } else {
    ok("locate backup zip on disk", zipPath)
    const info = inspectZip(zipPath)
    if (info.manifest_static > 0) {
      ok("backup includes static files", `${info.manifest_static} files`)
    } else {
      fail("backup includes static files", "manifest static_files = 0")
    }
    if (info.tables >= 100) {
      ok("backup includes DB tables", `${info.tables} tables`)
    } else {
      fail("backup includes DB tables", `${info.tables} tables`)
    }
    const { json: list } = await fetchJson("/admin/backup", {
      headers: adminHeaders(token),
    })
    const entry = list.backups?.find((b) => b.file_name === backupFile)
    if (entry && entry.size > 200_000) {
      ok("backup zip size reasonable", `${Math.round(entry.size / 1024)} KB`)
    } else {
      fail(
        "backup zip size reasonable",
        entry ? `${entry.size} bytes` : "entry not listed"
      )
    }
  }

  // Mutate AFTER backup so restore must roll back this change
  const probeName = `__backup_e2e_probe_${Date.now()}__`
  await fetchJson("/admin/site-settings", {
    method: "POST",
    headers: adminHeaders(token),
    body: JSON.stringify({ store_name: probeName }),
  })
  ok("mutate site_settings after backup", probeName)

  // --- Restore from the backup we just created ---
  const restoreRes = await fetchJson("/admin/backup/restore", {
    method: "POST",
    headers: adminHeaders(token),
    body: JSON.stringify({ file_name: backupFile }),
  })
  if (restoreRes.status !== 202) {
    fail("POST /admin/backup/restore", String(restoreRes.status))
    process.exit(1)
  }
  ok("POST /admin/backup/restore", backupFile)

  const restoreJob = await waitForJob(token, "restore")
  if (restoreJob.status === "completed") {
    ok("restore job completed", restoreJob.result?.pre_restore_file || "")
  } else {
    fail("restore job completed", restoreJob.error || "unknown")
  }

  // Allow APIs to settle
  await sleep(2000)

  // --- Post-restore verification ---
  const settingsAfter = await storeGet("/store/site-settings", pk)
  if (settingsAfter.status === 200) {
    ok("store site-settings API (after restore)")
    if (settingsAfter.json.site_settings?.hero_images != null) {
      ok("hero_images not null after restore")
    } else {
      fail("hero_images not null after restore", "null")
    }
  } else {
    fail(
      "store site-settings API (after restore)",
      `${settingsAfter.status} ${JSON.stringify(settingsAfter.json)}`
    )
  }

  const adminAfter = await fetchJson("/admin/site-settings", {
    headers: adminHeaders(token),
  })
  const restoredName = adminAfter.json.site_settings?.store_name ?? null
  if (restoredName === storeNameAtBackup) {
    ok("restore reverted DB mutation", String(restoredName))
  } else {
    fail(
      "restore reverted DB mutation",
      `expected ${storeNameAtBackup}, got ${restoredName}`
    )
  }

  if (sampleStaticPath) {
    const imgAfter = await fetchJson(sampleStaticPath)
    if (imgAfter.status === 200) {
      ok("product static image (after restore)", sampleStaticPath)
    } else {
      fail(
        "product static image (after restore)",
        `${sampleStaticPath} → ${imgAfter.status}`
      )
    }
  }

  const productsAfter = await storeGet(
    "/store/products?limit=100&fields=id,title",
    pk
  )
  if (
    productsAfter.status === 200 &&
    productsAfter.json.products?.length ===
      productsBefore.json.products?.length
  ) {
    ok(
      "product count unchanged after restore",
      String(productsAfter.json.products.length)
    )
  } else {
    fail(
      "product count unchanged after restore",
      `${productsBefore.json.products?.length} → ${productsAfter.json.products?.length}`
    )
  }

  // Re-run key storefront pages after restore
  for (const [p, label] of baselinePages.slice(0, 5)) {
    await checkHttp200(`${label} (post-restore)`, p)
  }

  // Restore original store name for cleanliness
  await fetchJson("/admin/site-settings", {
    method: "POST",
    headers: adminHeaders(token),
    body: JSON.stringify({ store_name: cleanupStoreName }),
  })

  console.log("\n=== Summary ===")
  const passed = results.filter((r) => r.pass).length
  const failed = results.filter((r) => !r.pass)
  console.log(`${passed}/${results.length} passed`)
  if (failed.length) {
    console.log("\nFailed checks:")
    for (const f of failed) {
      console.log(`  - ${f.name}: ${f.detail}`)
    }
    process.exit(1)
  }
  console.log("\nAll backup E2E checks passed.\n")
}

main().catch((e) => {
  console.error("FATAL:", e.message || e)
  process.exit(1)
})
