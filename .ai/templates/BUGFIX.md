# TEMPLATE: BUGFIX

## Goal
Broken vs expected; surface (URL/admin/API).

## Files to inspect
Failing UI; useMedusaApi vs useApi; backend api; nginx; env keys; seeds.

## Checklist
- [ ] Reproduced; root cause; minimal fix; dual-API ruled out

## Acceptance Criteria
Bug gone; related path intact; no secrets.

## Risks
FE-only fix when BE wrong; stale publishable key after DB reset.

## Deliverables
Patch + repro + verify steps.
