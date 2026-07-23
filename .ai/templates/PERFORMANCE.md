# TEMPLATE: PERFORMANCE

## Goal
Improve load/interaction without new infra.

## Files to inspect
Page + heavy sections/Swiper/images; nuxt image; client plugins; CSS; Medusa query limits.

## Checklist
NuxtImg/lazy; async components; no duplicate fetches; no Redis invented.

## Acceptance Criteria
Clear improvement; behavior unchanged; SSR data OK.

## Risks
Docker HMR mistaken for app perf.

## Deliverables
Patch + before/after notes.
