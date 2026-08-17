#!/usr/bin/env node
/**
 * E2E test for the two core backup UI actions:
 *   1. Tạo bản sao lưu  (POST /admin/backup)
 *   2. Phục hồi từ file (POST /admin/backup/restore multipart upload)
 *
 * Also verifies restore-from-server-file (JSON body file_name).
 */
import { readFileSync, existsSync, createReadStream } from "node:fs"
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
const pass = (n, d = "") => { results.push({ pass: true, name: n, detail: d }); console.log(`PASS: ${n}${d ? ` — ${d}` : ""}`) }
const fail = (n, d = "") => { results.push({ pass: false, name: n, detail: d }); console.error(`FAIL: ${n}${d ? ` — ${d}` : ""}`) }

async function fetchJson(urlPath, init = {}) {
  const res = await fetch(`${BASE}${urlPath}`, init)
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = { raw: text.slice(0, 400) } }
  return { status: res.status, json, text, headers: res.headers }
}

async function adminLogin() {
  const { status, json } = await fetchJson("/auth/user/emailpass", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  if (status !== 200 || !json.token) throw new Error(`login failed: ${status}`)
  return json.token
}

function adminHeaders(token, extra = {}) {
  return { Authorization: `Bearer ${token}`, ...extra }
}

async function waitForJob(token, expectType) {
  const deadline = Date.now() + JOB_TIMEOUT_MS
  while (Date.now() < deadline) {
    const { json } = await fetchJson("/admin/backup", { headers: adminHeaders(token) })
    const job = json.job
    if (!job || job.type !== expectType) { await sleep(POLL_MS); continue }
    if (job.status === "completed") return job
    if (job.status === "failed") throw new Error(`${expectType} failed: ${job.error}`)
    await sleep(POLL_MS)
  }
  throw new Error(`${expectType} timed out`)
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

function resolveBackupPath(fileName) {
  const candidates = [
    path.join(process.env.HOME || "", "thanglongcheviet-native/apps/backend/.medusa/server/.backups", fileName),
    path.resolve(__dirname, "../apps/backend/.medusa/server/.backups", fileName),
    path.resolve(__dirname, "../apps/backend/.backups", fileName),
  ]
  return candidates.find((p) => existsSync(p)) || null
}

function inspectZip(zipPath) {
  const py = path.resolve(__dirname, "tmp-inspect-backup.py")
  const out = execSync(`python3 ${JSON.stringify(py)} ${JSON.stringify(zipPath)}`, { encoding: "utf8" })
  return JSON.parse(out.trim())
}

async function getPublishableKey(token) {
  const { json } = await fetchJson("/admin/api-keys?limit=20&type=publishable", {
    headers: adminHeaders(token, { "Content-Type": "application/json" }),
  })
  return json.api_keys?.find((k) => k.token)?.token || ""
}

async function getSiteName(token) {
  const { json } = await fetchJson("/admin/site-settings", {
    headers: adminHeaders(token, { "Content-Type": "application/json" }),
  })
  return json.site_settings?.store_name ?? null
}

async function setSiteName(token, name) {
  await fetchJson("/admin/site-settings", {
    method: "POST",
    headers: adminHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({ store_name: name }),
  })
}

async function uploadRestoreZip(token, zipPath) {
  const boundary = `----formdata-${Date.now()}`
  const fileName = path.basename(zipPath)
  const fileBuf = readFileSync(zipPath)
  const preamble = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/zip\r\n\r\n`
  )
  const epilogue = Buffer.from(`\r\n--${boundary}--\r\n`)
  const body = Buffer.concat([preamble, fileBuf, epilogue])

  const res = await fetch(`${BASE}/admin/backup/restore`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body,
  })
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = { raw: text.slice(0, 400) } }
  return { status: res.status, json }
}

async function main() {
  console.log(`\n=== Core backup E2E (create + restore from file) @ ${BASE} ===\n`)

  const health = await fetchJson("/health")
  if (health.status === 200) pass("backend health")
  else { fail("backend health", String(health.status)); process.exit(1) }

  const token = await adminLogin()
  pass("admin login", ADMIN_EMAIL)

  const pk = await getPublishableKey(token)
  if (pk) pass("publishable key")
  else fail("publishable key")

  const nameAtBackup = await getSiteName(token)
  pass("read site_settings before backup", String(nameAtBackup))

  // ── 1. Tạo bản sao lưu ──
  const create = await fetchJson("/admin/backup", {
    method: "POST",
    headers: adminHeaders(token, { "Content-Type": "application/json" }),
  })
  if (create.status === 202) pass("create backup → 202 accepted")
  else { fail("create backup", String(create.status)); process.exit(1) }

  const backupJob = await waitForJob(token, "backup")
  const backupFile = backupJob.result?.file_name
  if (backupFile) pass("create backup job completed", backupFile)
  else { fail("create backup job", "no file_name"); process.exit(1) }

  const zipPath = resolveBackupPath(backupFile)
  if (!zipPath) { fail("locate backup zip", backupFile); process.exit(1) }
  pass("locate backup zip", zipPath)

  const info = inspectZip(zipPath)
  if (info.manifest_static > 0) pass("backup contains media", `${info.manifest_static} files`)
  else fail("backup contains media", "0 static files")
  if (info.tables >= 100) pass("backup contains DB", `${info.tables} tables`)
  else fail("backup contains DB", `${info.tables} tables`)

  const listAfterCreate = await fetchJson("/admin/backup", { headers: adminHeaders(token) })
  const listed = listAfterCreate.json.backups?.find((b) => b.file_name === backupFile)
  if (listed && listed.size > 200_000) pass("backup listed with size", `${Math.round(listed.size / 1024)} KB`)
  else fail("backup listed with size", listed ? `${listed.size} B` : "not in list")

  // Mutate after backup so restore must revert
  const probe = `__restore_upload_probe_${Date.now()}__`
  await setSiteName(token, probe)
  pass("mutated store_name after backup", probe)

  // ── 2. Phục hồi từ file (multipart upload) ──
  const upload = await uploadRestoreZip(token, zipPath)
  if (upload.status === 202) pass("restore from file upload → 202")
  else { fail("restore from file upload", `${upload.status} ${JSON.stringify(upload.json)}`); process.exit(1) }

  const restoreJob = await waitForJob(token, "restore")
  if (restoreJob.status === "completed") pass("restore from file job completed", restoreJob.result?.pre_restore_file || "")
  else fail("restore from file job", restoreJob.error || "failed")

  await sleep(2000)

  const restoredName = await getSiteName(token)
  if (restoredName === nameAtBackup) pass("restore reverted mutation", String(restoredName))
  else fail("restore reverted mutation", `expected ${nameAtBackup}, got ${restoredName}`)

  const settings = await fetchJson("/store/site-settings", {
    headers: { "Content-Type": "application/json", "x-publishable-api-key": pk },
  })
  if (settings.status === 200) pass("site-settings API after restore")
  else fail("site-settings API after restore", `${settings.status}`)

  const products = await fetchJson("/store/products?limit=5&fields=id,title,thumbnail", {
    headers: { "Content-Type": "application/json", "x-publishable-api-key": pk },
  })
  if (products.status === 200 && products.json.products?.length) {
    pass("products API after restore", `${products.json.products.length} products`)
    const thumb = products.json.products.find((p) => p.thumbnail?.startsWith("/static/"))?.thumbnail
    if (thumb) {
      const img = await fetchJson(thumb)
      if (img.status === 200) pass("product image after restore", thumb)
      else fail("product image after restore", `${thumb} → ${img.status}`)
    }
  } else fail("products API after restore", String(products.status))

  // ── 3. Restore from server file (file_name JSON — dropdown action) ──
  await setSiteName(token, probe)
  const serverRestore = await fetchJson("/admin/backup/restore", {
    method: "POST",
    headers: adminHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({ file_name: backupFile }),
  })
  if (serverRestore.status === 202) pass("restore from server file → 202")
  else fail("restore from server file", `${serverRestore.status}`)

  await waitForJob(token, "restore")
  const nameAfterServer = await getSiteName(token)
  if (nameAfterServer === nameAtBackup) pass("server-file restore reverted mutation")
  else fail("server-file restore", `expected ${nameAtBackup}, got ${nameAfterServer}`)

  // cleanup
  if (nameAtBackup) await setSiteName(token, nameAtBackup)

  console.log("\n=== Summary ===")
  const failed = results.filter((r) => !r.pass)
  console.log(`${results.length - failed.length}/${results.length} passed`)
  if (failed.length) {
    failed.forEach((f) => console.log(`  - ${f.name}: ${f.detail}`))
    process.exit(1)
  }
  console.log("\nCore backup create + restore from file: ALL PASSED\n")
}

main().catch((e) => { console.error("FATAL:", e.message || e); process.exit(1) })
