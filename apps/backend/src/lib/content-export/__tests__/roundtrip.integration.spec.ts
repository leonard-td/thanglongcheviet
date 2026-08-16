/**
 * Round-trip export → import (merge) against a real Postgres DATABASE_URL.
 * Skipped automatically when DATABASE_URL is unset (CI/local without DB).
 *
 * Run: npm run test:integration:lib
 */
import fsp from "node:fs/promises"
import { connectDb, listColumns, quoteIdent } from "../../backup/db"
import { exportContentJson } from "../export-json"
import { importContentJson } from "../import-json"

jest.mock("../../backup/create", () => ({
  createBackup: jest.fn(async () => ({
    fileName: "pre-import-mock.zip",
    filePath: "/tmp/pre-import-mock.zip",
    manifest: { manifest_version: 1 },
  })),
}))

const TABLES = ["card", "site_setting"] as const
const RUN = process.env.DATABASE_URL ? describe : describe.skip

const CARD_ID = "card_rtest_export_import"
const SITE_ID = "sset_rtest_export_import"

async function tableExists(name: string): Promise<boolean> {
  const client = await connectDb()
  try {
    const res = await client.query(
      `SELECT to_regclass('public.${name}') IS NOT NULL AS ok`
    )
    return Boolean(res.rows[0]?.ok)
  } finally {
    await client.end()
  }
}

async function deleteTestRows(): Promise<void> {
  const client = await connectDb()
  try {
    await client.query(`DELETE FROM ${quoteIdent("card")} WHERE id = $1`, [
      CARD_ID,
    ])
    await client.query(`DELETE FROM ${quoteIdent("site_setting")} WHERE id = $1`, [
      SITE_ID,
    ])
  } finally {
    await client.end()
  }
}

async function insertTestRows(): Promise<void> {
  const client = await connectDb()
  try {
    const cardCols = await listColumns(client, "card")
    const siteCols = await listColumns(client, "site_setting")

    const cardRow: Record<string, unknown> = {
      id: CARD_ID,
      type: "link",
      title: { vi: "Roundtrip test", en: "Roundtrip test" },
      image: "/images/test.jpg",
      path: "/roundtrip-test",
      rank: 9999,
      is_active: true,
      locked: false,
    }
    if (cardCols.includes("topic_id")) cardRow.topic_id = null

    const siteRow: Record<string, unknown> = {
      id: SITE_ID,
      store_name: "RT Export Import Shop",
      email: "rt@test.local",
      phone: "0900000000",
      address: "1 Test Street",
      hero_images: JSON.stringify([]),
    }
    if (siteCols.includes("home_video_url")) siteRow.home_video_url = null

    const cardInsertCols = cardCols.filter((c) => c in cardRow)
    const siteInsertCols = siteCols.filter((c) => c in siteRow)

    await client.query(
      `INSERT INTO ${quoteIdent("card")} (${cardInsertCols.map(quoteIdent).join(", ")})
       VALUES (${cardInsertCols.map((_, i) => `$${i + 1}`).join(", ")})
       ON CONFLICT (${quoteIdent("id")}) DO UPDATE SET
       ${cardInsertCols
         .filter((c) => c !== "id")
         .map((c) => `${quoteIdent(c)} = EXCLUDED.${quoteIdent(c)}`)
         .join(", ")}`,
      cardInsertCols.map((c) => cardRow[c])
    )

    await client.query(
      `INSERT INTO ${quoteIdent("site_setting")} (${siteInsertCols.map(quoteIdent).join(", ")})
       VALUES (${siteInsertCols.map((_, i) => `$${i + 1}`).join(", ")})
       ON CONFLICT (${quoteIdent("id")}) DO UPDATE SET
       ${siteInsertCols
         .filter((c) => c !== "id")
         .map((c) => `${quoteIdent(c)} = EXCLUDED.${quoteIdent(c)}`)
         .join(", ")}`,
      siteInsertCols.map((c) => siteRow[c])
    )
  } finally {
    await client.end()
  }
}

async function readCardTitle(): Promise<string | null> {
  const client = await connectDb()
  try {
    const res = await client.query(
      `SELECT title FROM ${quoteIdent("card")} WHERE id = $1`,
      [CARD_ID]
    )
    const title = res.rows[0]?.title
    if (title == null) return null
    return typeof title === "string" ? title : JSON.stringify(title)
  } finally {
    await client.end()
  }
}

async function readSiteName(): Promise<string | null> {
  const client = await connectDb()
  try {
    const res = await client.query(
      `SELECT store_name FROM ${quoteIdent("site_setting")} WHERE id = $1`,
      [SITE_ID]
    )
    return res.rows[0]?.store_name ?? null
  } finally {
    await client.end()
  }
}

RUN("content-export round-trip (merge)", () => {
  let exportPath: string

  beforeAll(async () => {
    for (const t of TABLES) {
      if (!(await tableExists(t))) {
        throw new Error(`Table "${t}" missing — run migrations first`)
      }
    }
  })

  beforeEach(async () => {
    await deleteTestRows()
    await insertTestRows()
  })

  afterEach(async () => {
    await deleteTestRows()
    if (exportPath) {
      await fsp.rm(exportPath, { force: true }).catch(() => {})
    }
  })

  it("exports card + site_setting to valid JSON", async () => {
    const result = await exportContentJson([...TABLES])
    exportPath = result.filePath

    expect(result.manifest.format_version).toBe(1)
    expect(result.manifest.tables.card?.rows.some((r) => r.id === CARD_ID)).toBe(
      true
    )
    expect(
      result.manifest.tables.site_setting?.rows.some((r) => r.id === SITE_ID)
    ).toBe(true)

    const raw = await fsp.readFile(exportPath, "utf8")
    expect(() => JSON.parse(raw)).not.toThrow()
  })

  it("merge import restores mutated rows (card + site_setting)", async () => {
    const exported = await exportContentJson([...TABLES])
    exportPath = exported.filePath

    const client = await connectDb()
    try {
      await client.query(
        `UPDATE ${quoteIdent("card")} SET title = $1 WHERE id = $2`,
        [JSON.stringify({ vi: "Mutated", en: "Mutated" }), CARD_ID]
      )
      await client.query(
        `UPDATE ${quoteIdent("site_setting")} SET store_name = $1 WHERE id = $2`,
        ["Mutated Shop", SITE_ID]
      )
    } finally {
      await client.end()
    }

    expect(await readCardTitle()).toContain("Mutated")
    expect(await readSiteName()).toBe("Mutated Shop")

    const imported = await importContentJson(exportPath, [...TABLES], "merge")
    expect(imported.imported_tables).toEqual(
      expect.arrayContaining([...TABLES])
    )
    expect(imported.mode).toBe("merge")

    expect(await readCardTitle()).toContain("Roundtrip test")
    expect(await readSiteName()).toBe("RT Export Import Shop")
  })

  it("filters blocked customer table out of import selection", async () => {
    const exported = await exportContentJson(["card"])
    exportPath = exported.filePath

    const result = await importContentJson(
      exportPath,
      ["card", "customer"],
      "merge"
    )
    expect(result.imported_tables).toEqual(["card"])
    expect(result.imported_tables).not.toContain("customer")
    expect(result.skipped_blocked).toEqual(["customer"])
  })
})
