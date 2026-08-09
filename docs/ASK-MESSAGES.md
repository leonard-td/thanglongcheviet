# Ask Messages — Architecture & Usage Guide

> **Status:** Implemented on Medusa store API + Nuxt FAB  
> **Stack:** Medusa 2 · Nuxt 3 · rule-engine NLU · optional Cohere Rerank  
> **Branch:** `feat/ask-messages`  
> **Updated:** 2026-08-09

Storefront chat assistant for Thăng Long Chè Việt: FAQ/policy answers, catalog keyword search (price/sort), product suggestion cards, related chips, and human escalate → inquiry + care-channel.

**Not** the admin Telegram/Zalo CSKH inbox (`care-messages`). Do not merge the two concepts.

---

## 1. Quick summary

| Item | Status |
|------|--------|
| Nuxt FAB + chat panel (`WidgetsAskMessages`) | ✅ |
| `POST /store/ask` (session + answer pipeline) | ✅ |
| `POST /store/ask/escalate` → inquiry + care notify | ✅ |
| Rule-engine mapper (no LLM NLU) | ✅ `ASK_NLU_PROVIDER=rule` |
| Medusa catalog in-process search (no Typesense) | ✅ |
| Optional Cohere Rerank (`rerank-v3.5`) | ✅ opt-in |
| VI / EN UI + answer language | ✅ |
| Audience / occasion gift facets | ❌ out of scope (tea catalog) |
| Color / Size apparel option filters | ❌ disabled (tea SKUs) |
| Typesense / hybrid embed / LLM mapper | ❌ out of scope |

---

## 2. Architecture

```text
Browser
  WidgetsAskMessages (FAB)
       │  useAsk()
       ▼
  POST /store/ask  { message, sessionId? }
       │
       ▼
  modules/ask AskModuleService.sendMessage
       ├─ load published Medusa products (+ prices when region available)
       ├─ setAskCatalog (in-process)
       ├─ history last 6 turns from session Map
       └─ answerQuestion(q, history)
              │
              ▼
         getQueryMapper()  →  ruleQueryMapper  (ASK_NLU_PROVIDER=rule)
              │
              ▼
         executeMappedPlan(MappedPlan)
              ├─ courtesy / FAQ / escalate / clarify
              ├─ sort / filter (price, stock) / aggregate
              └─ lexical → keyword search (+ optional Cohere rerank)
              │
              ▼
         ChatMessage { content, suggestions?, relatedQuestions? }

Escalate path (when assistant content = escalate sentinel):
  UI form → POST /store/ask/escalate
       → inquiry module (type contact, source ask-messages)
       → care-channel.notifySupportChannels (fail-soft)
```

### 2.1 Layers

| Layer | Path | Responsibility |
|-------|------|----------------|
| UI | `apps/web/components/widgets/AskMessages.vue` | FAB, thread, cards, chips, escalate form |
| Client API | `apps/web/composables/useAsk.ts` | `fetchMedusa` to store routes |
| Contracts (FE) | `apps/web/utils/ask.ts` | Types + escalate sentinel match |
| Store API | `apps/backend/src/api/store/ask/` | HTTP entry |
| Orchestration | `apps/backend/src/modules/ask/service.ts` | Catalog load, session, hydrate suggestions |
| Engine | `answer.ts` → `mapper/` → `query/` → `search/` | NLU + retrieval |
| FAQ policy | `config/knowledge-base.ts` | Patterns + answers VI/EN |
| Session | `session-store.ts` | In-memory `Map` (process lifetime) |

### 2.2 Answer kinds

| Kind | Meaning | UI |
|------|---------|-----|
| `resolved` | FAQ / sort / filter / catalog empty copy | Text + optional product cards |
| `suggested` | Lexical product matches | Note + up to 3 cards |
| `escalated` | Sensitive / low-confidence / engine escalate | Escalate **sentinel** → contact form |

Escalate form shows only when `content` equals exactly:

- VI: `Chúng tôi chưa tìm thấy câu trả lời phù hợp. Để lại thông tin liên hệ, đội ngũ sẽ phản hồi sớm.`
- EN: `We couldn't find a confident answer. Leave your contact details and our team will reply.`

SSOT: `apps/backend/src/modules/ask/config/thresholds.ts`  
Storefront re-exports: `types.ts` (`ESCALATE_MESSAGE` = VI).  
FE mirror: `apps/web/utils/ask.ts`.

### 2.3 Search model (no Typesense)

1. Load published products via Medusa Query graph (priced when region exists; fallback without prices).
2. Keyword score on title / description / handle / categories (`search/keyword-search.ts`).
3. Price / in-stock filters + sort (`search/catalog-query.ts`).
4. Optional Cohere rerank on recalled hits (`COHERE_RERANK=1`).
5. Hydrate suggestions via `/san-pham/{handle}` (storefront `localePath` maps EN → `/products/...`).

**Honest limits**

- “Best selling / top-rated” has no Medusa sales/rating field → stable featured catalog order; copy says “nổi bật / featured”, not fake ranking.
- Color/Size option grammar is **off** (`ASK_OPTION_FILTERS_ENABLED = false`) so tea queries like “chè màu hồng” stay lexical.
- `inStock` is currently always `true` in the Ask catalog mapper (MVP).

### 2.4 Session & anaphora

- Backend: last 6 turns in process `Map` keyed by `sessionId`.
- Frontend: `sessionStorage` key `tlcv-ask-session-v1` restores transcript + `sessionId` when remounting between homepage (`layout: false`) and default layout.
- Anaphora (“cái đó”) expands from prior assistant `productSlugs` (Unicode-aware regex).

Restarting the Medusa process clears backend history (FE transcript may remain).

### 2.5 Mount points (avoid double FAB)

| Surface | Mount |
|---------|--------|
| Most pages | `layouts/default.vue` → `WidgetsAskMessages` |
| Homepage | `pages/index.vue` (`layout: false`) → `WidgetsAskMessages` |
| `GlobalWidgets.vue` | **Must not** remount Ask (comment only) |

---

## 3. API contracts

### 3.1 `POST /store/ask`

**Auth:** Store publishable key (same as other `/store/*` calls). No customer login required.

**Request**

```json
{
  "message": "chè tôm",
  "sessionId": "sess_optional"
}
```

**Response `200`**

```json
{
  "sessionId": "sess_…",
  "message": {
    "id": "msg_…",
    "sessionId": "sess_…",
    "role": "assistant",
    "content": "…",
    "suggestions": [
      {
        "id": "prod_…",
        "slug": "che-tom",
        "title": "Chè Tôm",
        "price": 150000,
        "currencyCode": "vnd",
        "image": "https://…"
      }
    ],
    "relatedQuestions": ["Phí ship bao nhiêu?", "Chè ướp sen"],
    "createdAt": "2026-08-09T00:00:00.000Z"
  }
}
```

`suggestions` / `relatedQuestions` omitted when empty.

### 3.2 `POST /store/ask/escalate`

**Request** — `q` required; **email or phone** required.

```json
{
  "q": "hàng bị hỏng khi nhận",
  "name": "An",
  "phone": "09…",
  "email": "a@example.com"
}
```

**Response `201`**

```json
{
  "success": true,
  "inquiry_id": "…",
  "message": "Thanks — our team will follow up."
}
```

Creates inquiry (`type: contact`, `service: ask-escalate`, `source: ask-messages`) and notifies care channels asynchronously (log warn on failure; still returns success if inquiry saved).

---

## 4. Configuration

Set in root `.env` / `.env.dev` (compose passes through to backend). Placeholders in `.env.example`.

| Variable | Default | Meaning |
|----------|---------|---------|
| `ASK_NLU_PROVIDER` | `rule` | Only `rule` is supported on TLCV |
| `COHERE_API_KEY` | empty | Server-only; never `NUXT_PUBLIC_*` |
| `COHERE_RERANK` | `0` | Set `1` to enable Cohere rerank after keyword recall |
| `ASK_CURRENCY_CODE` | `vnd` | Fallback if no Medusa region |

Compose: `infra/docker-compose.yml` → backend service env.

```bash
# enable rerank in local/dev
ASK_NLU_PROVIDER=rule
COHERE_API_KEY=your_key_here
COHERE_RERANK=1
```

---

## 5. Usage guide

### 5.1 End users (storefront)

1. Open the Ask FAB (bottom-right; Connect widget stays bottom-left).
2. Ask in Vietnamese or English, for example:
   - Greeting: `xin chào`
   - FAQ: `ship bao lâu?`, `đổi trả như thế nào?`, `bảo hành bao lâu?`
   - Catalog: `chè tôm`, `chè dưới 200k`, `sản phẩm rẻ nhất`
   - Corporate: `quà doanh nghiệp`
   - Complaint (escalate form): `hàng bị hỏng khi nhận`
3. Tap product cards to open PDP; tap related chips to send a follow-up.
4. On escalate, leave phone and/or email → CSKH receives inquiry.

### 5.2 Developers — local run

```bash
# from repo root
./start.dev.sh
# or your usual compose up for web + backend + postgres
```

Smoke API (replace publishable key):

```bash
curl -s http://localhost:9000/store/ask \
  -H "content-type: application/json" \
  -H "x-publishable-api-key: $NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY" \
  -d '{"message":"chè tôm"}' | jq .
```

Unit tests:

```bash
cd apps/backend
npm run test:unit -- --testPathPattern=ask
```

### 5.3 Extending FAQ / tea nouns

| Change | File |
|--------|------|
| New FAQ / sensitive intent | `modules/ask/config/knowledge-base.ts` |
| Related chips | `modules/ask/config/related-questions.ts` |
| Product synonyms / expand | `modules/ask/config/synonyms.ts` |
| Known tea nouns in residual | `modules/ask/query/residual.ts` |
| Copy strings | `modules/ask/config/messages.ts` |
| UI strings | `apps/web/locales/vi.json` + `en.json` → `ask.*` |

Rules of thumb:

- Prefer longer, specific patterns; avoid bare ASCII tokens that collide (e.g. do not add bare `hong` for “hỏng”).
- Corporate FAQ should not hijack generic “quà tặng” alone — keep “doanh nghiệp” / B2B markers.
- Do not re-enable Color/Size filters without real Medusa Color/Size options on tea SKUs.

### 5.4 Ops / CSKH

- Escalations appear as **contact inquiries** with source `ask-messages`.
- Care-channel (Telegram/Zalo) notification uses the same pipeline as the public contact form.
- Ask session history is **not** durable across Medusa restarts — treat escalate inquiries as the system of record for unresolved chats.

---

## 6. File map

```text
apps/backend/src/modules/ask/
  answer.ts                 # answerQuestion facade
  service.ts                # sendMessage orchestration
  session-store.ts
  catalog-context.ts
  classifier.ts
  types.ts                  # Chat DTO + escalate re-exports
  mapper/                   # rule mapper, execute, session anaphora
  query/                    # classify, residual, superlative
  search/                   # keyword, catalog filters, Cohere
  config/                   # FAQ, messages, thresholds, grammars
  __tests__/answer.unit.spec.ts

apps/backend/src/api/store/ask/
  route.ts
  escalate/route.ts

apps/web/
  components/widgets/AskMessages.vue
  composables/useAsk.ts
  utils/ask.ts
```

Module registration: `apps/backend/medusa-config.ts` → `./src/modules/ask`.

---

## 7. Decisions & non-goals

Recorded in `.ai/DECISIONS.md` **014**.

| Decision | Rationale |
|----------|-----------|
| Medusa `/store/ask` not Nest/Next | TLCV stack is Nuxt + Medusa only |
| Rule mapper only | No LLM key/ops budget for NLU on soft launch |
| No Typesense | Catalog size fits in-process keyword; ops simpler |
| Cohere = rerank opt-in | Precision after recall; fail-soft if API down |
| Separate from care-messages | Machine assistant vs human inbox |

**Non-goals:** Typesense hybrid, LLM MappedPlan, gift-shop audience facets, apparel Color/Size filtering, persistent Ask transcript DB.

---

## 8. Smoke checklist

- [ ] FAB visible on home + inner pages (single instance)
- [ ] `xin chào` → courtesy + tea-domain chips (not headphones)
- [ ] `ship bao lâu?` → FAQ VI
- [ ] `chè tôm` → product card(s) linking to PDP
- [ ] `chè dưới 200k` → price-filtered set
- [ ] `chè màu hồng` → lexical/tea path (not empty “color pink” filter)
- [ ] `hàng bị hỏng` → escalate form; submit creates inquiry
- [ ] Navigate home ↔ product page → transcript restored (`sessionStorage`)
- [ ] With `COHERE_RERANK=1` + key: lexical answers still succeed if Cohere fails (fail-soft)

---

## 9. Production go-live (best quality)

> **Full checklist (site + Ask + HTTPS + backup + rollback):** see [`docs/GO-LIVE.md`](./GO-LIVE.md).

Goal: Ask works on first page load (publishable key present), answers are tea-relevant, escalate reaches CSKH, Cohere improves ranking without breaking when offline.

### 9.1 Required before traffic

1. **Merge** `feat/ask-messages` (or release branch that includes it) into the branch you deploy.
2. **`.env.prod`** (never commit secrets):

```bash
ASK_NLU_PROVIDER=rule
COHERE_API_KEY=<server-only key>
COHERE_RERANK=1          # recommended for best product ranking
JWT_SECRET=<strong>
COOKIE_SECRET=<strong>
POSTGRES_PASSWORD=<strong>
# HTTPS real domain: leave COOKIE_SECURE unset (do not set false)
MEDUSA_BACKEND_URL=https://your.domain
TELEGRAM_BOT_TOKEN=...   # care-channel for escalate
TELEGRAM_CHAT_ID=...
```

3. **Prod compose** must pass Ask env into backend (`infra/docker-compose.prod.yml` — `ASK_NLU_PROVIDER`, `COHERE_API_KEY`, `COHERE_RERANK`).
4. Deploy:

```bash
# remote
PUSH_ENV=1 DEPLOY_DOMAIN=your.domain ./deploy.sh user@server

# or on the host
./start.prod.sh
```

`run-prod-stack.sh` → `provisioning.sh` already:
- runs `setup-web-integration.mjs`
- **force-recreates `web`** so Nuxt loads `NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`
- smokes `GET /store/site-settings` + `POST /store/ask`

### 9.2 Catalog / CSKH quality gates

| Gate | Why |
|------|-----|
| Products **published**, VND prices, good titles/descriptions (chè / sen / nhài…) | Keyword Ask ranks on these fields |
| Product images present | Ask cards look complete |
| Care-channel Telegram seeded + tested | Escalate form → inquiry → notify |
| Admin watches inquiries `source: ask-messages` | Human follow-up SoT |

### 9.3 Honest production limits (do not over-promise)

| Topic | Behavior |
|-------|----------|
| Session history | In-memory; **lost on Medusa restart** — escalate/inquiry is durable |
| “Bán chạy / top-rated” | Featured catalog order, not real sales ranking |
| Stock | Ask mapper currently treats items as in stock |
| Typesense / LLM NLU | Not on this stack |
| Cohere down | Fail-soft — keyword order still returned |

### 9.4 Post-deploy smoke (5 minutes)

```bash
PK=...  # from .env.prod
curl -s -o /dev/null -w '%{http_code}\n' -H "x-publishable-api-key: $PK" https://your.domain/store/site-settings
curl -s https://your.domain/store/ask -H "content-type: application/json" \
  -H "x-publishable-api-key: $PK" -d '{"message":"chè tôm"}'
```

Browser: hard-refresh homepage → Ask FAB → chào / ship / sản phẩm / escalate with phone.

### 9.5 Ops weekly

- Skim Ask escalate inquiries + care-channel delivery failures in backend logs.
- Spot-check 5 real product queries after catalog edits (titles matter more than new regex).
- Keep `COHERE_API_KEY` rotated/server-only; never in `NUXT_PUBLIC_*`.
