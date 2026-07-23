# CODE_STYLE.md

- TS + Nuxt `<script setup lang="ts">`; match surrounding style.  
- Fetch via `useAsyncData` / composables; commerce → `useMedusaApi`; don’t expand legacy `useApi` casually.  
- Tailwind mobile-first; keep Modis CSS unless tasked to migrate.  
- Brand tokens in `tailwind.config.js` (primary gold `#c9a86c`).  
- Medusa modules: model → service → Module → config → migrations.  
- Admin: `useTranslation()`, actions column rule.  
- Lint: `@medusajs/eslint-plugin` at root.
