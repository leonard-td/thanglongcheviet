#!/usr/bin/env node
/**
 * Integration test: concurrent event registrations must not exceed event capacity.
 *
 * Usage:
 *   EVENT_ID=evt_... node scripts/test-event-registration-race.mjs
 *   BASE_URL=http://localhost:8800 PUBLISHABLE_KEY=pk_... EVENT_ID=evt_... node scripts/test-event-registration-race.mjs
 */

const PK =
  process.env.PUBLISHABLE_KEY ||
  process.env.NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  ""
const BASE = (process.env.BASE_URL || "http://localhost:8800").replace(/\/$/, "")
const EVENT_ID = process.env.EVENT_ID || ""
const CONCURRENCY = Number(process.env.CONCURRENCY || 5)
const SEATS_PER_REQUEST = Number(process.env.SEATS_PER_REQUEST || 1)

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

async function findCappedEvent() {
  const { status, body } = await fetchJson("/store/events?limit=20")
  if (status !== 200 || !Array.isArray(body?.events)) {
    fail(`Could not list events (HTTP ${status})`)
  }
  const event = body.events.find(
    (e) => e.registration_open && e.capacity != null && e.capacity > 0
  )
  if (!event) {
    fail("No active event with finite capacity found — set EVENT_ID manually")
  }
  return event
}

async function register(i, eventId) {
  const { status, body, text } = await fetchJson("/store/event-registrations", {
    method: "POST",
    body: JSON.stringify({
      event_id: eventId,
      name: `Event Race ${i}`,
      phone: `0910000${String(i).padStart(3, "0")}`,
      quantity: SEATS_PER_REQUEST,
      source: "race-test",
    }),
  })
  return { i, status, body, text }
}

async function run() {
  console.log(`\n=== Event registration race test ===`)
  console.log(`BASE=${BASE} CONCURRENCY=${CONCURRENCY}`)

  const health = await fetch(`${BASE}/health`)
  if (!health.ok) fail(`Backend not reachable at ${BASE}/health`)

  let event
  if (EVENT_ID) {
    const { status, body } = await fetchJson(`/store/events/${EVENT_ID}`)
    if (status !== 200 || !body?.event) fail(`Event ${EVENT_ID} not found`)
    event = body.event
  } else {
    event = await findCappedEvent()
  }

  const capacity = event.capacity
  console.log(`Event: ${event.id} "${event.title}" capacity=${capacity}`)

  const results = await Promise.all(
    Array.from({ length: CONCURRENCY }, (_, idx) => register(idx + 1, event.id))
  )

  for (const r of results) {
    const msg =
      typeof r.body === "object"
        ? r.body.message || JSON.stringify(r.body)
        : r.text?.slice(0, 120)
    console.log(`  request ${r.i}: HTTP ${r.status} — ${msg}`)
  }

  const accepted = results.filter((r) => r.status === 201)
  const maxAllowed = Math.ceil(capacity / SEATS_PER_REQUEST)

  if (accepted.length > maxAllowed) {
    fail(
      `Over-registration: ${accepted.length} accepted but max ~${maxAllowed} for capacity ${capacity}`
    )
  }

  pass(
    `Event race OK — ${accepted.length} accepted, ${results.length - accepted.length} rejected (capacity ${capacity})`
  )
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
