#!/usr/bin/env node
/**
 * Live E2E smoke tests for employees + navigation menus.
 */
const BASE = process.env.MEDUSA_URL || "http://localhost:9000"
const EMAIL = process.env.ADMIN_EMAIL || "admin@medusa.local"
const PASSWORD = process.env.ADMIN_PASSWORD || "supersecret123"
const PUB_KEY_ENV = process.env.NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

const results = []

function ok(name, detail) {
  results.push({ name, pass: true, detail })
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ""}`)
}
function fail(name, detail) {
  results.push({ name, pass: false, detail })
  console.log(`❌ ${name} — ${detail}`)
}

async function req(path, { method = "GET", token, body, publishable } = {}) {
  const headers = { "Content-Type": "application/json" }
  if (token) headers.Authorization = `Bearer ${token}`
  if (publishable) headers["x-publishable-api-key"] = publishable
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = { raw: text }
  }
  return { status: res.status, json }
}

async function main() {
  console.log(`\n=== Live tests against ${BASE} ===\n`)

  // Login
  const login = await req("/auth/user/emailpass", {
    method: "POST",
    body: { email: EMAIL, password: PASSWORD },
  })
  const token = login.json.token
  if (!token) {
    fail("admin login", JSON.stringify(login.json).slice(0, 300))
    process.exit(1)
  }
  ok("admin login", EMAIL)

  // Resolve a real publishable key (env override, else first admin key)
  let publishableKey = PUB_KEY_ENV
  if (!publishableKey) {
    const keys = await req("/admin/api-keys?limit=20&type=publishable", {
      token,
    })
    publishableKey = (keys.json.api_keys || []).find((k) => k.token)?.token || ""
  }
  if (!publishableKey) {
    fail("resolve publishable key", "none found — set NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY")
  } else {
    ok("resolve publishable key", `${publishableKey.slice(0, 8)}…`)
  }

  // ---- Navigation ----
  const menusList = await req("/admin/navigation-menus", { token })
  if (menusList.status === 200 && Array.isArray(menusList.json.menus)) {
    ok(
      "GET /admin/navigation-menus",
      `count=${menusList.json.count ?? menusList.json.menus.length}`
    )
  } else {
    fail(
      "GET /admin/navigation-menus",
      `${menusList.status} ${JSON.stringify(menusList.json).slice(0, 300)}`
    )
  }

  const slug = `qa-menu-${Date.now()}`
  const createdMenu = await req("/admin/navigation-menus", {
    method: "POST",
    token,
    body: { name: "QA Menu", slug, activate: false },
  })
  const menuId = createdMenu.json.menu?.id
  if (createdMenu.status === 201 && menuId) {
    ok("POST /admin/navigation-menus", menuId)
  } else {
    fail(
      "POST /admin/navigation-menus",
      `${createdMenu.status} ${JSON.stringify(createdMenu.json).slice(0, 400)}`
    )
  }

  let rootId, childId, root2Id
  if (menuId) {
    const root = await req("/admin/navigations", {
      method: "POST",
      token,
      body: {
        menu_id: menuId,
        label: "Sản phẩm QA",
        url: "/san-pham-list",
        order: 0,
      },
    })
    rootId = root.json.navigation?.id
    root.status === 201 && rootId
      ? ok("POST /admin/navigations root", rootId)
      : fail("POST /admin/navigations root", JSON.stringify(root.json).slice(0, 300))

    const child = await req("/admin/navigations", {
      method: "POST",
      token,
      body: {
        menu_id: menuId,
        label: "Con QA",
        url: "/san-pham-list?x=1",
        parent_id: rootId,
        order: 0,
      },
    })
    childId = child.json.navigation?.id
    child.status === 201 && childId
      ? ok("POST /admin/navigations child", childId)
      : fail("POST /admin/navigations child", JSON.stringify(child.json).slice(0, 300))

    const depth3 = await req("/admin/navigations", {
      method: "POST",
      token,
      body: {
        menu_id: menuId,
        label: "Too deep",
        url: "/x",
        parent_id: childId,
      },
    })
    depth3.status >= 400
      ? ok("reject depth>2", depth3.json.message || `status ${depth3.status}`)
      : fail("reject depth>2", "should have failed")

    const root2 = await req("/admin/navigations", {
      method: "POST",
      token,
      body: {
        menu_id: menuId,
        label: "Liên hệ QA",
        url: "/lien-he",
        order: 1,
      },
    })
    root2Id = root2.json.navigation?.id

    const reorder = await req("/admin/navigations/reorder", {
      method: "POST",
      token,
      body: {
        menu_id: menuId,
        items: [
          { id: root2Id, parent_id: null, order: 0 },
          { id: rootId, parent_id: null, order: 1 },
          { id: childId, parent_id: rootId, order: 0 },
        ],
      },
    })
    const tree = reorder.json.tree || reorder.json.navigations || []
    reorder.status === 200 && tree[0]?.label === "Liên hệ QA"
      ? ok("POST /admin/navigations/reorder", tree.map((n) => n.label).join(" > "))
      : fail("POST /admin/navigations/reorder", JSON.stringify(reorder.json).slice(0, 400))

    const treeGet = await req(`/admin/navigations?menu_id=${menuId}`, { token })
    const t = treeGet.json.tree || treeGet.json.navigations || []
    treeGet.status === 200 && t.length >= 2
      ? ok("GET tree by menu_id", `${t.length} roots`)
      : fail("GET tree by menu_id", JSON.stringify(treeGet.json).slice(0, 300))

    const activate = await req(`/admin/navigation-menus/${menuId}/activate`, {
      method: "POST",
      token,
      body: {},
    })
    activate.status === 200 && activate.json.menu?.is_active
      ? ok("POST activate menu", activate.json.menu.slug)
      : fail("POST activate menu", JSON.stringify(activate.json).slice(0, 300))

    const store = await req("/store/navigations", { publishable: publishableKey })
    const storeRoots = store.json.navigations || []
    const activeSlug = store.json.menu?.slug
    store.status === 200 && activeSlug === slug
      ? ok(
          "GET /store/navigations active",
          `${activeSlug}: ${storeRoots.map((n) => n.label).join(", ")}`
        )
      : fail(
          "GET /store/navigations active",
          `${store.status} ${JSON.stringify(store.json).slice(0, 400)}`
        )

    // Restore previous active if any (storefront-header)
    const allMenus = await req("/admin/navigation-menus", { token })
    const header = (allMenus.json.menus || []).find(
      (m) => m.slug === "storefront-header"
    )
    if (header) {
      await req(`/admin/navigation-menus/${header.id}/activate`, {
        method: "POST",
        token,
        body: {},
      })
      ok("restore storefront-header active", header.id)
    }

    // Cleanup QA menu (must be inactive)
    await req(`/admin/navigation-menus/${menuId}/activate`, {
      method: "POST",
      token,
      body: {},
    }).catch(() => {})
    // re-activate header first
    if (header) {
      await req(`/admin/navigation-menus/${header.id}/activate`, {
        method: "POST",
        token,
        body: {},
      })
    }
    const delMenu = await req(`/admin/navigation-menus/${menuId}`, {
      method: "DELETE",
      token,
    })
    delMenu.status === 200 && delMenu.json.deleted
      ? ok("DELETE QA menu", menuId)
      : fail("DELETE QA menu", JSON.stringify(delMenu.json).slice(0, 300))
  }

  // ---- Employees ----
  const empEmail = `qa.employee.${Date.now()}@tlcv.local`
  const empPass = "TlcvQa@12345"

  const roles = await req("/admin/rbac/roles?limit=50", { token })
  const roleId =
    (roles.json.roles || []).find((r) => r.id !== "role_super_admin")?.id ||
    (roles.json.roles || [])[0]?.id
  roles.status === 200
    ? ok("GET /admin/rbac/roles", `pick=${roleId}`)
    : fail("GET /admin/rbac/roles", JSON.stringify(roles.json).slice(0, 200))

  const createEmp = await req("/admin/employees", {
    method: "POST",
    token,
    body: {
      email: empEmail,
      password: empPass,
      first_name: "QA",
      last_name: "Employee",
      role_ids: roleId ? [roleId] : [],
    },
  })
  const empId = createEmp.json.employee?.id
  createEmp.status === 201 && empId
    ? ok(
        "POST /admin/employees",
        `${empId} roles=${(createEmp.json.employee.roles || [])
          .map((r) => r.name)
          .join(",")}`
      )
    : fail(
        "POST /admin/employees",
        `${createEmp.status} ${JSON.stringify(createEmp.json).slice(0, 500)}`
      )

  if (empId) {
    const list = await req("/admin/employees?limit=50", { token })
    const found = (list.json.employees || []).some((e) => e.id === empId)
    list.status === 200 && found
      ? ok("GET /admin/employees", `found ${empEmail}`)
      : fail("GET /admin/employees", JSON.stringify(list.json).slice(0, 300))

    const getOne = await req(`/admin/employees/${empId}`, { token })
    getOne.status === 200 && getOne.json.employee?.email === empEmail
      ? ok("GET /admin/employees/:id", empEmail)
      : fail("GET /admin/employees/:id", JSON.stringify(getOne.json).slice(0, 300))

    const rename = await req(`/admin/employees/${empId}`, {
      method: "POST",
      token,
      body: { first_name: "QA Renamed", last_name: "Employee" },
    })
    rename.status === 200 && rename.json.employee?.first_name === "QA Renamed"
      ? ok("POST rename employee", rename.json.employee.first_name)
      : fail("POST rename employee", JSON.stringify(rename.json).slice(0, 300))

    const setPass = await req(`/admin/employees/${empId}/password`, {
      method: "POST",
      token,
      body: { password: "TlcvQa@99999" },
    })
    setPass.status === 200 && setPass.json.success
      ? ok("POST set password", "success")
      : fail("POST set password", JSON.stringify(setPass.json).slice(0, 300))

    // Login with new password
    const empLogin = await req("/auth/user/emailpass", {
      method: "POST",
      body: { email: empEmail, password: "TlcvQa@99999" },
    })
    empLogin.json.token
      ? ok("employee login after password reset", "token ok")
      : fail("employee login after password reset", JSON.stringify(empLogin.json).slice(0, 300))

    const block = await req(`/admin/employees/${empId}`, {
      method: "POST",
      token,
      body: { blocked: true },
    })
    block.status === 200 && block.json.employee?.blocked === true
      ? ok("POST block employee", "blocked=true")
      : fail("POST block employee", JSON.stringify(block.json).slice(0, 300))

    // Blocked employee should get 403 (MedusaError.FORBIDDEN) on admin API
    const empToken = empLogin.json.token
    if (empToken) {
      const blockedCall = await req("/admin/employees", { token: empToken })
      blockedCall.status === 403
        ? ok(
            "blocked employee denied /admin",
            `${blockedCall.status} ${blockedCall.json.message || ""}`
          )
        : fail(
            "blocked employee denied /admin",
            `${blockedCall.status} ${JSON.stringify(blockedCall.json).slice(0, 300)}`
          )
    }

    const unblock = await req(`/admin/employees/${empId}`, {
      method: "POST",
      token,
      body: { blocked: false },
    })
    unblock.status === 200 && unblock.json.employee?.blocked === false
      ? ok("POST unblock employee", "blocked=false")
      : fail("POST unblock employee", JSON.stringify(unblock.json).slice(0, 300))

    // Cannot block self
    const me = await req("/admin/users/me", { token })
    const selfBlock = await req(`/admin/employees/${me.json.user.id}`, {
      method: "POST",
      token,
      body: { blocked: true },
    })
    selfBlock.status >= 400
      ? ok("cannot block self", selfBlock.json.message || String(selfBlock.status))
      : fail("cannot block self", "should fail")

    const del = await req(`/admin/employees/${empId}`, {
      method: "DELETE",
      token,
    })
    del.status === 200 && del.json.deleted
      ? ok("DELETE employee", empId)
      : fail("DELETE employee", JSON.stringify(del.json).slice(0, 300))
  }

  // Roles/policies i18n presence (extension file)
  const fs = await import("node:fs")
  const path = await import("node:path")
  const viPath = path.join(
    process.cwd(),
    "apps/backend/src/admin/i18n/json/vi.json"
  )
  const vi = JSON.parse(fs.readFileSync(viPath, "utf8"))
  vi.roles?.domain === "Vai trò" && vi.policies?.domain === "Chính sách"
    ? ok("vi.json roles/policies", `${vi.roles.domain} / ${vi.policies.domain}`)
    : fail("vi.json roles/policies", "missing translations")
  vi.menu?.employees && vi.menu?.navigation && vi.employees && vi.navigation
    ? ok("vi.json employees+navigation namespaces", "present")
    : fail("vi.json employees+navigation namespaces", "missing")

  const passed = results.filter((r) => r.pass).length
  const failed = results.filter((r) => !r.pass).length
  console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===\n`)
  process.exit(failed ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
