#!/usr/bin/env node
/**
 * E2E test for Export / Import nội dung (JSON):
 *   GET  /admin/backup/tables
 *   POST /admin/backup/export-json
 *   POST /admin/backup/import-json (merge roundtrip)
 */
const BASE = (process.env.BASE_URL || "http://localhost:8800").replace(/\/$/, "")
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@medusa.local"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "supersecret123"
const POLL_MS = 1500
const JOB_TIMEOUT_MS = 120000

const results = []
const pass = (n, d = "") => {
  results.push({ pass: true, name: n, detail: d })
  console.log(`PASS: ${n}${d ? ` — ${d}` : ""}`)
}
const fail = (n, d = "") => {
  results.push({ pass: false, name: n, detail: d })
  console.error(`FAIL: ${n}${d ? ` — ${d}` : ""}`)
}

async function fetchJson(urlPath, init = {}) {
  const res = await fetch(`${BASE}${urlPath}`, init)
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = { raw: text.slice(0, 400) }
  }
  return { status: res.status, json, text }
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function waitForJob(token, expectType) {
  const deadline = Date.now() + JOB_TIMEOUT_MS
  while (Date.now() < deadline) {
    const { json } = await fetchJson("/admin/backup", { headers: adminHeaders(token) })
    const job = json.job
    if (!job || job.type !== expectType) {
      await sleep(POLL_MS)
      continue
    }
    if (job.status === "completed") return job
    if (job.status === "failed") throw new Error(`${expectType} failed: ${job.error}`)
    await sleep(POLL_MS)
  }
  throw new Error(`${expectType} timed out`)
}

async function main() {
  const token = await adminLogin()
  pass("admin login")

  const tablesRes = await fetchJson("/admin/backup/tables", {
    headers: adminHeaders(token),
  })
  if (tablesRes.status !== 200) {
    fail("GET /admin/backup/tables", `status ${tablesRes.status}`)
    summarize()
    process.exit(1)
  }
  const tables = tablesRes.json.tables ?? []
  if (tables.length < 10) {
    fail("tables list populated", `got ${tables.length}`)
  } else {
    pass("GET /admin/backup/tables", `${tables.length} tables`)
  }

  const exportTables = ["site_setting", "card"]
  const exportRes = await fetchJson("/admin/backup/export-json", {
    method: "POST",
    headers: adminHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({ tables: exportTables }),
  })
  if (exportRes.status !== 202) {
    fail("POST /admin/backup/export-json", `status ${exportRes.status}`)
    summarize()
    process.exit(1)
  }
  pass("POST /admin/backup/export-json", "202 accepted")

  const exportJob = await waitForJob(token, "export-json")
  const exportFile = exportJob.result?.file_name
  if (!exportFile?.endsWith(".json")) {
    fail("export-json job completed", `missing file: ${exportFile}`)
  } else {
    pass("export-json job completed", exportFile)
  }

  const downloadRes = await fetch(
    `${BASE}/admin/backup/files/${encodeURIComponent(exportFile)}`,
    { headers: adminHeaders(token) }
  )
  if (downloadRes.status !== 200) {
    fail("download exported JSON", `status ${downloadRes.status}`)
    summarize()
    process.exit(1)
  }
  const jsonText = await downloadRes.text()
  pass("download exported JSON", `${jsonText.length} bytes`)

  let payload
  try {
    payload = JSON.parse(jsonText)
    pass("export JSON parseable")
  } catch (e) {
    fail("export JSON parseable", String(e))
    summarize()
    process.exit(1)
  }

  for (const tbl of exportTables) {
    if (payload.tables?.[tbl]) pass(`export contains table ${tbl}`)
    else fail(`export contains table ${tbl}`)
  }

  const form = new FormData()
  form.append(
    "file",
    new Blob([jsonText], { type: "application/json" }),
    exportFile
  )
  form.append("tables", JSON.stringify(exportTables))
  form.append("mode", "merge")

  const importRes = await fetch(`${BASE}/admin/backup/import-json`, {
    method: "POST",
    headers: adminHeaders(token),
    body: form,
  })
  if (importRes.status !== 202) {
    const body = await importRes.text()
    fail("POST /admin/backup/import-json", `status ${importRes.status} ${body.slice(0, 200)}`)
    summarize()
    process.exit(1)
  }
  pass("POST /admin/backup/import-json", "202 accepted")

  const importJob = await waitForJob(token, "import-json")
  if (importJob.status !== "completed") {
    fail("import-json job completed", importJob.error)
  } else {
    pass("import-json job completed", importJob.result?.pre_restore_file ?? "")
  }

  const listRes = await fetchJson("/admin/backup", { headers: adminHeaders(token) })
  const jsonFiles = (listRes.json.backups ?? []).filter((b) => b.file_name.endsWith(".json"))
  if (jsonFiles.some((b) => b.file_name === exportFile)) {
    pass("exported JSON listed in GET /admin/backup")
  } else {
    fail("exported JSON listed in GET /admin/backup")
  }

  summarize()
  process.exit(results.some((r) => !r.pass) ? 1 : 0)
}

function summarize() {
  const passed = results.filter((r) => r.pass).length
  const failed = results.filter((r) => !r.pass).length
  console.log(`\n=== ${passed} passed, ${failed} failed ===`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
