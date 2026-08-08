# Branch note: `fix/booking-slot-race`

This branch fixes **booking slot overbooking under concurrent requests** and includes the **date-only booking bypass** fix from `dev/base` (PR #18).

## What this branch achieves

### 1. Race condition fix (primary)

**Problem:** Two users could book the same time slot at the same time. Both passed the capacity check before either insert completed → slot could exceed `BOOKING_SLOT_CAPACITY` (default 3).

**Solution:**

- `apps/backend/src/modules/utils/booking-slot-lock.ts` — PostgreSQL session advisory locks per `date + time`
- `InquiryModuleService.createBookingIfAvailable()` — lock → count → insert atomically
- `POST /store/bookings` uses `createBookingIfAvailable()` instead of check-then-create

**Verified:** `scripts/test-booking-race.mjs` — 5 concurrent requests → 3 accepted, 2 rejected.

### 2. Date-only bypass fix (from PR #18, merged via `dev/base`)

**Problem:** Bookings could be submitted with a date but no time, skipping slot capacity rules.

**Solution:**

- Backend requires `preferred_time` and validates it against daily slots
- `ContactSection.vue` blocks submit when a date is chosen but no time is selected

### 3. Event registration race fix

- `EventModuleService.registerForEventIfAvailable()` with transaction advisory locks
- `POST /store/event-registrations` uses atomic registration

## Merge status

- Merged latest `dev/base` at `1e79c233` (includes PR #18 + #19)
- Conflict in `bookings/route.ts` resolved: kept atomic `createBookingIfAvailable()` path

## Key files

| File | Purpose |
|------|---------|
| `apps/backend/src/modules/utils/booking-slot-lock.ts` | Session lock + SQL count |
| `apps/backend/src/modules/inquiry/service.ts` | `createBookingIfAvailable()` |
| `apps/backend/src/api/store/bookings/route.ts` | Store booking API |
| `apps/web/components/sections/ContactSection.vue` | Contact/booking form UI |
| `scripts/test-booking-race.mjs` | Integration test (concurrent bookings) |
| `scripts/test-event-registration-race.mjs` | Integration test (events; needs capped event) |

## How to test

```bash
# Booking race (expect ≤3 success for capacity 3)
PUBLISHABLE_KEY=pk_... BASE_URL=http://localhost:8800 \
  TEST_DATE=2026-09-21 TEST_TIME=14:00 \
  node scripts/test-booking-race.mjs
```

After backend code changes in prod, rebuild and restart:

```bash
cd apps/backend && npx medusa build --lint false
docker restart tlcv_backend_prod
```

## PR target

Merge into `dev/base`: https://github.com/leonard-td/thanglongcheviet/compare/dev/base...fix/booking-slot-race
