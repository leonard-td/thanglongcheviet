# BUSINESS_RULES.md

1. Default locale **vi**; **en** secondary; `prefix_except_default`.  
2. UI strings in `apps/web/locales/{vi,en}.json`; admin strings in **both** `apps/backend/src/admin/i18n/json/{vi,en}.json`.  
3. Store API needs publishable key (+ region); customer JWT cookie `customer_token`.  
4. Blog ≈ campaign posts/topics (TipTap); JSON fallbacks in `content/` when APIs fail.  
5. Bookings: `name`, `phone`, `preferred_date` required; time slots must be available.  
6. Admin tables: actions only in last column (`CLAUDE.md`).  
7. Mobile-first; prefer `NuxtImg`; SEO meta on pages.  
8. No Redis in this Docker setup without revisiting hang; `COOKIE_SECURE=false` only for local HTTP; never mount at `/app`.
