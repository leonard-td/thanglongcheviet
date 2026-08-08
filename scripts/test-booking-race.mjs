#!/usr/bin/env node
/**
 * Integration test: concurrent bookings for the same slot must not exceed
 * BOOKING_SLOT_CAPACITY (default 3).
 *
 * Usage:
 *   node scripts/test-booking-race.mjs
 *   BASE_URL=http://localhost:8800 PUBLISHABLE_KEY=pk_... node scripts/test-booking-race.mjs
 *   TEST_DATE=2026-09-01 TEST_TIME=14:00 CONCURRENCY=5 node scripts/test-booking-race.mjs
 */

const PK =
  process.env.PUBLISHABLE_KEY ||
  process.env.NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  ""
const BASE = (process.env.BASE_URL || "http://localhost:8800").replace(/\/$/, "")
const DATE =
  process.env.TEST_DATE ||
  new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
const TIME = process.env.TEST_TIME || "14:00"
const CONCURRENCY = Number(process.env.CONCURRENCY || 5)
const CAPACITY = Number(process.env.BOOKING_SLOT_CAPACITY || 3)

function fail(msg) {
  console.error(`FAIL: ${msg}`)
  process.exit(1)
}

function pass(msg) {
  console.log(`PASS: ${msg}`)
}

async function fetchJson(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(PK ? { "x-publishable-api-key": PK } : {}),
      ...(init.headers || {}),
    },
  })
  const text = await res.text()
  let body
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  return { status: res.status, body, text }
}

async function checkHealth() {
  const res = await fetch(`${BASE}/health`)
  if (!res.ok) {
    fail(`Backend not reachable at ${BASE}/health (HTTP ${res.status})`)
  }
  pass(`Backend healthy at ${BASE}`)
}

async function checkAvailability() {
  const { status, body } = await fetchJson(
    `/store/bookings/availability?date=${encodeURIComponent(DATE)}`
  )
  if (status !== 200 || !body?.slots) {
    fail(`Availability API failed (HTTP ${status}): ${JSON.stringify(body)}`)
  }
  const slot = body.slots.find((s) => s.time === TIME)
  if (!slot) {
    fail(`Time ${TIME} is not a valid slot for ${DATE}`)
  }
  pass(`Availability API OK — ${TIME} on ${DATE} available=${slot.available}`)
  return slot
}

async function book(i) {
  const { status, body, text } = await fetchJson("/store/bookings", {
    method: "POST",
    body: JSON.stringify({
      name: `Race Test ${i}`,
      phone: `0900000${String(i).padStart(3, "0")}`,
      preferred_date: DATE,
      preferred_time: TIME,
      note: "booking-race integration test",
    }),
  })
  return { i, status, body, text }
}

async function runRace() {
  console.log(`\n=== Booking race test ===`)
  console.log(`BASE=${BASE}`)
  console.log(`DATE=${DATE} TIME=${TIME} CONCURRENCY=${CONCURRENCY} CAPACITY=${CAPACITY}`)
  if (!PK) {
    console.warn("WARN: No PUBLISHABLE_KEY set — store API may reject requests")
  }

  await checkHealth()
  await checkAvailability()

  const results = await Promise.all(
    Array.from({ length: CONCURRENCY }, (_, idx) => book(idx + 1))
  )

  for (const r of results) {
    const msg =
      typeof r.body === "object"
        ? r.body.message || JSON.stringify(r.body)
        : r.text?.slice(0, 120)
    console.log(`  request ${r.i}: HTTP ${r.status} — ${msg}`)
  }

  const accepted = results.filter((r) => r.status === 201)
  const rejected = results.filter((r) => r.status !== 201)

  console.log(`\nResults: ${accepted.length} accepted, ${rejected.length} rejected`)

  if (accepted.length > CAPACITY) {
    fail(
      `Overbooking detected: ${accepted.length} bookings accepted but capacity is ${CAPACITY}`
    )
  }

  if (accepted.length === 0 && CONCURRENCY > 0) {
    fail("No bookings accepted — slot may already be full or API misconfigured")
  }

  // After race, availability should show slot full if we hit capacity
  const { body: after } = await fetchJson(
    `/store/bookings/availability?date=${encodeURIComponent(DATE)}`
  )
  const slotAfter = after?.slots?.find((s) => s.time === TIME)
  if (slotAfter && accepted.length >= CAPACITY && slotAfter.available) {
    fail(
      `Availability still shows slot open after ${accepted.length} bookings (capacity ${CAPACITY})`
    )
  }

  if (accepted.length >= CAPACITY) {
    pass(`Slot correctly capped at ${CAPACITY} (${accepted.length} accepted, ${rejected.length} rejected)`)
  } else {
    pass(
      `Race completed without overbooking (${accepted.length}/${CAPACITY} slots used this run)`
    )
  }

  console.log("\nAll booking race checks passed.")
}

runRace().catch((err) => {
  console.error(err)
  process.exit(1)
})
