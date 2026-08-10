# Ask Messages — Full Guide (Thăng Long Chè Việt)

> **Status:** Shipped (Medusa store API + Nuxt FAB + Typesense)  
> **Stack:** Medusa 2 · Nuxt 3 · Typesense BM25 · rule-engine NLU · optional Cohere Rerank / Embed  
> **Updated:** 2026-08-09  
> **Related:** [`docs/GO-LIVE.md`](./GO-LIVE.md) · [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) · [`.ai/DECISIONS.md`](../.ai/DECISIONS.md) (014, 015)

Storefront chat assistant for **Thăng Long Chè Việt**: FAQ/policy answers, catalog search (Typesense primary, lib fail-soft), product suggestion cards, related chips, and human escalate → inquiry + care-channel.

**Not** the admin Telegram/Zalo CSKH inbox (`care-messages`). Do not merge the two products.

---

## Table of contents

0. [Start here (newcomers)](#0-start-here-newcomers)
1. [Quick summary](#1-quick-summary)
2. [Architecture](#2-architecture)
3. [Answer pipeline](#3-answer-pipeline)
4. [Search & Typesense](#4-search--typesense)
5. [Index sync & reindex](#5-index-sync--reindex)
6. [API contracts](#6-api-contracts)
7. [Configuration](#7-configuration)
8. [Frontend](#8-frontend)
9. [Usage](#9-usage)
10. [Extending](#10-extending)
11. [File map](#11-file-map)
12. [Decisions & non-goals](#12-decisions--non-goals)
13. [Smoke checklist](#13-smoke-checklist)
14. [Production](#14-production)
15. [Troubleshooting](#15-troubleshooting)

---

## 0. Start here (newcomers)

### 0.1 What is Ask?

On the storefront, a floating button (FAB, bottom-right) opens a chat. Shoppers ask about shipping, returns, or tea products. The backend answers from:

1. **FAQ / policy** text (in-code knowledge base), or  
2. **Product catalog** search (Typesense, with keyword fallback), or  
3. **Escalate** — show a contact form → save an **inquiry** → notify CSKH (Telegram/Zalo).

There is **no ChatGPT/LLM** understanding the question. A **rule engine** (patterns + grammars) decides the route.

### 0.2 Who should read which section

| You are… | Read first | Then |
|----------|------------|------|
| **New developer (day 1)** | §0.3–0.6, §9.2 | §2 diagram, §15 if stuck |
| **Frontend** | §8, §3.2 sentinel, §6.1–6.2 | §0.5 mount points |
| **Backend / search** | §2–5, §7, §11 | §10 extending |
| **Ops / deploy** | §5, §7, §14 | [`GO-LIVE.md`](./GO-LIVE.md) |
| **CSKH / support** | §0.7, §9.1, §9.3 | Admin → Customer Inquiries |

### 0.3 Glossary (read once)

| Term | Meaning on TLCV |
|------|-----------------|
| **FAB** | Floating Action Button — the chat bubble on the storefront |
| **Ask** | This storefront assistant (`/store/ask`) |
| **care-messages** | Separate **admin** inbox for human CSKH (Telegram/Zalo). Not Ask |
| **Publishable key** | Public Medusa store key (`x-publishable-api-key` / `NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`). Required for browser → `/store/*` |
| **MappedPlan** | Structured plan from the rule mapper (route = FAQ / search / escalate / …) |
| **Typesense** | Search engine holding a copy of published products for Ask BM25 search |
| **BM25** | Classic keyword ranking inside Typesense (default mode) |
| **lib engine** | In-process keyword search over products loaded from Medusa (fallback) |
| **Fail-soft** | If Typesense/Cohere fails, Ask still answers via a simpler path (logged) |
| **Reindex** | Full rebuild of Typesense from Medusa published products |
| **Hybrid** | BM25 + Cohere vector embeddings (`TYPESENSE_HYBRID=1`) — opt-in, costs money |
| **Rerank** | Cohere reorders product hits after recall (`COHERE_RERANK=1`) — opt-in |
| **Escalate sentinel** | Exact assistant sentence that unlocks the contact form (VI or EN) |
| **Inquiry** | Durable contact ticket in Admin (`source: ask-messages`) |
| **Session** | Chat history: backend Map (lost on restart) + browser `sessionStorage` |

### 0.4 Mental model — one question

Example: user types **`chè tôm`**.

```text
1. Nuxt FAB → useAsk() → POST /store/ask  (+ publishable key)
2. Backend loads published products into memory (for cards/prices)
3. Rule mapper: not FAQ → lexical catalog search
4. Typesense BM25 on collection "products" → product ids
5. Hydrate ids → cards with image/price/slug
6. Optional Cohere rerank (if enabled)
7. Response: text note + up to 3 product cards + related chips
```

Example: **`ship bao lâu?`** → FAQ match → text only (no cards).  
Example: **`hàng bị hỏng`** → escalate sentinel → UI shows phone/email form → inquiry.

### 0.5 Day-1 local setup (first success)

**Prerequisites:** Docker + Compose v2, Node 20+ (for host scripts), git. Repo root = Thăng Long Chè Việt monorepo.

```bash
# 1) Env
cp .env.example .env.dev
# Edit .env.dev if needed. Defaults already include:
#   SEARCH_SOURCE=typesense
#   TYPESENSE_* (dev key)
# Optional later: COHERE_API_KEY, COHERE_RERANK=1, SEARCH_REINDEX_TOKEN=...

# 2) Start stack (Postgres + Typesense + Medusa + Nuxt + nginx)
./start.dev.sh
```

Wait until backend is healthy (first boot can take several minutes for `npm install` + migrate).

| URL | What |
|-----|------|
| http://localhost:8800 | Storefront (Ask FAB bottom-right) |
| http://localhost:9000 | Medusa API / Admin (`/app`) |
| Typesense | Internal only (`typesense:8108` on Docker network) |

```bash
# 3) Confirm Ask env inside backend
docker exec tlcv_backend printenv ASK_NLU_PROVIDER SEARCH_SOURCE TYPESENSE_HOST

# 4) Confirm Typesense healthy
docker exec tlcv_typesense bash -c \
  'exec 3<>/dev/tcp/127.0.0.1/8108 && echo -e "GET /health HTTP/1.0\r\n\r\n" >&3 && cat <&3' | head

# 5) IMPORTANT — index products (empty Typesense = weak/empty catalog answers)
# Prefer docker exec: TYPESENSE_HOST=typesense only resolves inside Compose.
docker exec -w /workspace/apps/backend tlcv_backend npm run ask:reindex
```

```bash
# 6) Get publishable key (written by setup-web-integration into .env.dev)
grep NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY .env.dev

# 7) Smoke API (replace KEY)
curl -s http://localhost:9000/store/ask \
  -H "content-type: application/json" \
  -H "x-publishable-api-key: KEY" \
  -d '{"message":"chè tôm"}' | jq .
```

**Browser:** open http://localhost:8800 → hard-refresh (Cmd/Ctrl+Shift+R) → click Ask FAB → try `xin chào`, then `chè tôm`.

If the FAB errors about the publishable key: re-run `./start.dev.sh` (it recreates `web` after writing the key), or recreate web yourself after `setup-web-integration`.

**Catalog note:** Ask only indexes **published** products with usable titles. Seed/import tea products in Admin if the catalog is empty.

### 0.6 Roles after day 1

| Goal | Do this |
|------|---------|
| Change FAQ copy | `modules/ask/config/knowledge-base.ts` + unit test |
| Change UI strings | `apps/web/locales/vi.json` / `en.json` → `ask.*` |
| Improve product recall | Better Medusa titles/descriptions → save product (subscriber sync) or `ask:reindex` |
| Turn on better ranking | Set `COHERE_API_KEY` + `COHERE_RERANK=1` on backend; recreate backend |
| Hybrid search | Only after BM25 smoke PASS → `TYPESENSE_HYBRID=1` → **reindex** |
| Deploy production | Follow [`GO-LIVE.md`](./GO-LIVE.md) + §14 here |

### 0.7 CSKH — where escalations appear

1. Shopper sees escalate form → submits phone and/or email.  
2. Admin → **Customer Inquiries** — look for `source: ask-messages` (contact type).  
3. If Telegram care-channel is seeded, a notify message is also sent (fail-soft: inquiry still saved if Telegram fails).

Ask **chat transcripts are not** a durable CRM. Restarting Medusa clears in-memory sessions. **Inquiries** are the system of record.

### 0.8 Common first-week mistakes

| Mistake | What happens | Fix |
|---------|--------------|-----|
| Skip `ask:reindex` | Ask answers FAQ but poor/no product cards | Reindex (§5) |
| Run `ask:reindex` on host with `TYPESENSE_HOST=typesense` | Connection fail | `docker exec … npm run ask:reindex` |
| Publishable key written but web not recreated | FAB /store calls 401 | Recreate `web` / re-run `start.dev.sh` |
| Put `COHERE_API_KEY` in `NUXT_PUBLIC_*` | Secret leak | Backend env only |
| Expect “bán chạy” = real sales | Featured order only | Honest limit — see §4.6 |
| Mount Ask in `GlobalWidgets` too | Double FAB | Layout + homepage only (§3.5) |
| Confuse Ask with care-messages | Wrong inbox / wrong code | Different products (§0.1) |

---

## 1. Quick summary

| Capability | Status |
|------------|--------|
| Nuxt FAB + chat panel (`WidgetsAskMessages`) | ✅ |
| `POST /store/ask` (session + answer pipeline) | ✅ |
| `POST /store/ask/escalate` → inquiry + care notify | ✅ |
| Rule-engine mapper (`ASK_NLU_PROVIDER=rule`) | ✅ |
| Typesense BM25 primary (`SEARCH_SOURCE=typesense`) | ✅ |
| Lib keyword fail-soft (Typesense down / empty) | ✅ |
| Product CUD → Typesense upsert/delete | ✅ |
| Full reindex (`ask:reindex` / `POST /admin/ask/reindex`) | ✅ |
| Optional Cohere Rerank (`rerank-v3.5`) | ✅ opt-in |
| Optional hybrid embed (`TYPESENSE_HYBRID=1`) | ✅ opt-in |
| VI / EN UI + answer language | ✅ |
| Audience / occasion gift facets | ❌ out of scope |
| Color / Size apparel option filters | ❌ disabled |
| LLM mapper / `tea_discovery` / content collection | ❌ out of scope |
| Durable Ask transcript DB | ❌ out of scope |

---

## 2. Architecture

### 2.1 End-to-end

```text
Browser
  WidgetsAskMessages (FAB)
       │  useAsk()  →  fetchMedusa
       ▼
  POST /store/ask  { message, sessionId? }
       │  x-publishable-api-key
       ▼
  AskModuleService.sendMessage
       ├─ loadAskCatalog (published Medusa products + prices)
       ├─ setAskCatalog          ← hydrate suggestions by id/slug
       ├─ history (last 6 turns from in-memory session)
       └─ answerQuestion(q, history)
              │
              ▼
         getQueryMapper() → ruleQueryMapper
              │
              ▼
         executeMappedPlan(MappedPlan)
              ├─ courtesy / FAQ / escalate / clarify
              ├─ sort / filter (price, stock) / aggregate
              └─ lexical → searchCatalogQuery
                              │
                              ├─ getSearchEngine()
                              │     ├─ typesense  (SEARCH_SOURCE=typesense)
                              │     └─ lib        (emergency / fail-soft)
                              └─ optional Cohere rerank
              │
              ▼
         assistant ChatMessage
           { content, suggestions?, relatedQuestions? }

  ── Index path (outside request) ──────────────────────────
  Medusa product / variant CUD
       → subscribers → upsert/delete Typesense `products`
  npm run ask:reindex
  POST /admin/ask/reindex
       → loadAskCatalog → syncTypesenseCatalog

  ── Escalate path ─────────────────────────────────────────
  content == escalate sentinel
       → UI form → POST /store/ask/escalate
       → inquiry (type contact, source ask-messages)
       → care-channel.notifySupportChannels (fail-soft)
```

### 2.2 Runtime services (Compose)

```text
nginx (:8800)          ← open this in the browser
  ├─ Nuxt web
  ├─ Medusa backend (:9000 also published for API/Admin)
  │     └─ Talks to Typesense + Postgres
  ├─ Typesense (:8108 internal — not required in browser)
  └─ Postgres
```

| Compose file | When |
|--------------|------|
| `infra/docker-compose.yml` | Local / `./start.dev.sh` |
| `infra/docker-compose.prod.yml` | Production / `./start.prod.sh` |

Volume: `typesense_data` — index survives container recreate; **wiping the volume requires reindex**.

Container names (dev): `tlcv_backend`, `tlcv_typesense`, `tlcv_web`, …  
Prod names usually end with `_prod` (e.g. `tlcv_backend_prod`).

### 2.3 Layers

| Layer | Path | Role |
|-------|------|------|
| UI | `apps/web/components/widgets/AskMessages.vue` | FAB, thread, cards, chips, escalate form |
| Client | `apps/web/composables/useAsk.ts` | Store API calls |
| FE contracts | `apps/web/utils/ask.ts` | Types + escalate sentinel match |
| Store HTTP | `apps/backend/src/api/store/ask/` | `POST /store/ask`, `/escalate` |
| Admin HTTP | `apps/backend/src/api/admin/ask/reindex/` | Full reindex |
| Orchestration | `modules/ask/service.ts` + `catalog-loader.ts` | Catalog, session, hydrate |
| Engine | `answer.ts` → `mapper/` → `query/` → `search/` | NLU + retrieval |
| Typesense | `modules/ask/search/typesense/` | Client, schema, search, sync, embed |
| Sync helpers | `src/lib/ask-search-index.ts` + `subscribers/` | CUD → index |
| FAQ | `config/knowledge-base.ts` | Policy patterns + VI/EN answers |
| Session | `session-store.ts` | In-memory `Map` (process lifetime) |

---

## 3. Answer pipeline

### 3.1 Answer kinds

| Kind | Meaning | UI |
|------|---------|-----|
| `resolved` | FAQ / sort / filter / empty-catalog copy | Text + optional product cards |
| `suggested` | Lexical / Typesense product matches | Note + up to **3** cards |
| `escalated` | Sensitive / low-confidence / engine escalate | Escalate **sentinel** → contact form |

### 3.2 Escalate sentinel (exact match)

Form appears only when assistant `content` equals **exactly**:

| Lang | Text |
|------|------|
| VI | `Chúng tôi chưa tìm thấy câu trả lời phù hợp. Để lại thông tin liên hệ, đội ngũ sẽ phản hồi sớm.` |
| EN | `We couldn't find a confident answer. Leave your contact details and our team will reply.` |

SSOT: `modules/ask/config/thresholds.ts`  
Backend re-export: `modules/ask/types.ts` (`ESCALATE_MESSAGE` = VI)  
FE mirror: `apps/web/utils/ask.ts`

Language of the sentinel follows the **user turn** (`detectLanguage`).

If you change the string in one place and not the other, the escalate form **will not open**.

### 3.3 Rule mapper (no LLM)

`ASK_NLU_PROVIDER=rule` → `ruleQueryMapper` builds a `MappedPlan`:

- Courtesy greetings
- FAQ / knowledge-base / sensitive → escalate
- Price filters / sort / aggregate (“rẻ nhất”, “dưới 200k”)
- Lexical residual → catalog search
- Session anaphora (“cái đó”) from prior `productSlugs` (Unicode-aware)

Color/Size apparel grammars stay **disabled** (`ASK_OPTION_FILTERS_ENABLED = false`) so tea phrases like `chè màu hồng` stay lexical.

### 3.4 Session & anaphora

| Store | Behavior |
|-------|----------|
| Backend | Last **6** turns in process `Map` keyed by `sessionId` |
| Frontend | `sessionStorage` key `tlcv-ask-session-v1` — restores transcript + `sessionId` across homepage (`layout: false`) ↔ default layout |

**Medusa process restart clears backend history.** FE transcript may remain; escalate inquiries are the durable SoT for unresolved chats.

### 3.5 Mount points (one FAB only)

| Surface | Mount |
|---------|--------|
| Most pages | `layouts/default.vue` → `WidgetsAskMessages` |
| Homepage | `pages/index.vue` (`layout: false`) → `WidgetsAskMessages` |
| `GlobalWidgets.vue` | **Must not** remount Ask |

---

## 4. Search & Typesense

### 4.1 Engine switch

| `SEARCH_SOURCE` | Engine | When |
|-----------------|--------|------|
| `typesense` (compose default) | Typesense BM25 (+ optional hybrid) | Production / normal |
| `lib` | In-process keyword over Ask catalog | Emergency only |

`getSearchEngine()` in `search/lib-engine.ts`.  
`searchCatalogQuery()` fail-softs Typesense transport errors → `libSearchEngine` (logged).

**Every Ask request still loads Medusa products** into memory to attach images/prices to hits. Typesense returns **ids**; Medusa snapshot hydrates the cards.

### 4.2 Request-time flow

1. Load published products → `setAskCatalog` (images, prices for hydration).
2. Typesense search on collection `products`, `query_by`: `name,category,tags,descr,handle`.
3. Filters: `sale_price`, `in_stock`. Sort via Typesense `sort_by` when the plan asks for price order.
4. Hits mapped to Ask catalog by **id** then **slug/handle**.
5. Optional synonym expand when exact recall is weak.
6. Optional Cohere **rerank** on product hits (`COHERE_RERANK=1`).
7. Suggestions hydrated to `/san-pham/{handle}` (EN locale maps via Nuxt `localePath`).

### 4.3 Collection schema (`products`)

| Field | Type | Notes |
|-------|------|--------|
| `id` | string | Medusa product id |
| `name` | string | Title |
| `descr` | string | Description |
| `price` / `sale_price` | float | Selling amount (budget filters use `sale_price`) |
| `category` | string | Joined category names |
| `tags` | string[] | Category names (facet) |
| `in_stock` | bool | Currently always true in Ask mapper (MVP) |
| `slug` / `handle` | string | Storefront handle |
| `popularity` / `rating` | int/float | Placeholder (no real sales ranking yet) |
| `embedding` | float\[1024\] | Only when hybrid ON |

FAQ stays in **process knowledge-base** — no Typesense `content` collection on TLCV.

### 4.4 Hybrid (opt-in)

```bash
TYPESENSE_HYBRID=1
COHERE_API_KEY=...          # required for hybrid to activate
```

- Model: Cohere `embed-multilingual-v3.0` (1024-dim)
- Embed on **index** (`search_document`) and **query** (`search_query`)
- Default **`TYPESENSE_HYBRID=0`** (cost). Enable only after BM25 smoke PASS.
- After flipping hybrid ON: run **`ask:reindex`** (may recreate collection to add `embedding`).

### 4.5 Cohere rerank (opt-in, independent of hybrid)

```bash
COHERE_RERANK=1
COHERE_API_KEY=...
```

Runs **after** recall. Fail-soft: if Cohere errors, keep BM25/lib order.

### 4.6 Honest search limits

- “Best selling / top-rated” → featured/stable order, **not** real sales metrics; copy says “nổi bật / featured”.
- `inStock` always `true` in Ask catalog mapper (MVP).
- No gift `attr_facets` (audience/occasion).
- No apparel Color/Size filters.
- Draft / unpublished products are **not** searchable.

---

## 5. Index sync & reindex

### 5.1 Automatic (subscribers)

| Event | Action |
|-------|--------|
| `product.created` / `product.updated` | Upsert Typesense doc (or delete if not published) |
| `product.deleted` | Delete Typesense doc |
| `product-variant.created/updated/deleted` | Resolve parent product → upsert |

Implementation: `src/subscribers/product-*-search-index.ts` → `src/lib/ask-search-index.ts` → `search/typesense/sync.ts`  
Failures are **logged**, never thrown into Admin write paths.

Sync runs when `TYPESENSE_HOST` + `TYPESENSE_API_KEY` are set (keeps index warm even if `SEARCH_SOURCE=lib` temporarily).

**Edit a product title in Admin** → subscriber should upsert within seconds. If Ask still shows old text, check backend logs for `[ask-search-index]` and reindex if needed.

### 5.2 Full reindex

**When:** first boot, empty Typesense volume, schema change (esp. enabling hybrid), bulk import, suspected drift.

```bash
# ✅ Recommended in Docker (dev)
docker exec -w /workspace/apps/backend tlcv_backend npm run ask:reindex

# ✅ Recommended in Docker (prod)
docker exec -w /workspace/apps/backend/.medusa/server tlcv_backend_prod \
  npx medusa exec ./src/scripts/ask-reindex.js

# Host (only if TYPESENSE_HOST=localhost and port 8108 is published)
npm run ask:reindex

# HTTP (ops token must be set in env)
curl -X POST http://localhost:9000/admin/ask/reindex \
  -H "x-search-reindex-token: $SEARCH_REINDEX_TOKEN"
```

**Auth for HTTP:** header `x-search-reindex-token` matching `SEARCH_REINDEX_TOKEN`, **or** admin session.  
Route uses `AUTHENTICATE = false` plus optional authenticate (`allowUnauthenticated: true`); the handler still enforces token **or** admin actor.

Reindex steps: load all **published** products → ensure collection → upsert docs → purge orphans. With hybrid ON, embeds each doc (slower, Cohere cost).

Success log looks like: `ask:reindex done — products=N hybrid=0`.

---

## 6. API contracts

All store routes need the publishable key header (same as other `/store/*` calls).

### 6.1 `POST /store/ask`

**Auth:** `x-publishable-api-key`. No customer login.

**Request**

```json
{
  "message": "chè tôm",
  "sessionId": "sess_optional"
}
```

| Field | Required | Notes |
|-------|----------|--------|
| `message` | yes | Non-empty trimmed string |
| `sessionId` | no | Reuse to keep backend history; omitted → new session |

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
Client must send back `sessionId` on the next turn for continuity.

**Errors:** missing `message` → `400` invalid data. Missing/invalid publishable key → `401` (Medusa store auth).

### 6.2 `POST /store/ask/escalate`

**Request** — `q` required; **email or phone** required (at least one).

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

Creates inquiry (`type: contact`, `service: ask-escalate`, `source: ask-messages`) and notifies care channels asynchronously (warn on notify failure; still `201` if inquiry saved).

### 6.3 `POST /admin/ask/reindex`

**Auth:** `x-search-reindex-token` **or** admin actor.

**Response `200`**

```json
{
  "ok": true,
  "products": 42,
  "hybrid": "0",
  "searchSource": "typesense"
}
```

**Errors:** `403` if neither token nor admin; `500` if Typesense env missing or sync throws.

---

## 7. Configuration

Set in root `.env` / `.env.dev` / `.env.prod` (compose injects into **backend**). Never put secrets in `NUXT_PUBLIC_*`.

| Variable | Default | Meaning |
|----------|---------|---------|
| `ASK_NLU_PROVIDER` | `rule` | Only `rule` supported |
| `SEARCH_SOURCE` | `typesense` (compose) | `typesense` \| `lib` |
| `TYPESENSE_HOST` | `typesense` | Docker **service name** (use `localhost` only if you publish 8108 and run Medusa on host) |
| `TYPESENSE_PORT` | `8108` | |
| `TYPESENSE_PROTOCOL` | `http` | Use `https` only if terminated externally |
| `TYPESENSE_API_KEY` | (example key) | **Change in prod**; must match Typesense container `--api-key` |
| `TYPESENSE_HYBRID` | `0` | `1` + Cohere key → BM25+vector |
| `SEARCH_REINDEX_TOKEN` | empty | Protects HTTP reindex; set a strong value in prod if you use curl reindex |
| `COHERE_API_KEY` | empty | Server-only |
| `COHERE_RERANK` | `0` | `1` enable rerank after recall |
| `ASK_CURRENCY_CODE` | `vnd` | Fallback if no Medusa region |

**Storefront (not Ask-specific, but required for FAB):**

| Variable | Notes |
|----------|--------|
| `NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | Filled by `setup-web-integration`; recreate `web` after change |
| `NUXT_PUBLIC_MEDUSA_BACKEND_URL` | Empty behind nginx same-origin (browser uses `/store`) |

Recommended **prod** quality set:

```bash
ASK_NLU_PROVIDER=rule
SEARCH_SOURCE=typesense
TYPESENSE_HOST=typesense
TYPESENSE_PORT=8108
TYPESENSE_PROTOCOL=http
TYPESENSE_API_KEY=<strong-unique-key>
TYPESENSE_HYBRID=0
SEARCH_REINDEX_TOKEN=<ops-token>
COHERE_API_KEY=<server-only>
COHERE_RERANK=1
```

Placeholders: [`.env.example`](../.env.example).

After changing backend env in Compose: recreate/restart the **backend** container so `printenv` matches.

---

## 8. Frontend

| Piece | Path |
|-------|------|
| Widget | `apps/web/components/widgets/AskMessages.vue` |
| Composable | `apps/web/composables/useAsk.ts` |
| Types / sentinel | `apps/web/utils/ask.ts` |
| i18n | `apps/web/locales/{vi,en}.json` → `ask.*` |

Behavior highlights:

- FAB bottom-right (Connect widget stays bottom-left).
- Product cards link to PDP via handle (`/san-pham/...` or locale equivalent).
- Related chips send a follow-up message through the same `sendMessage` path.
- Escalate form only on exact sentinel content (§3.2).
- `sessionStorage` key `tlcv-ask-session-v1` restores thread when remounting layouts.

FE does **not** talk to Typesense. Only Medusa `/store/ask*`.

---

## 9. Usage

### 9.1 End users (storefront)

1. Open Ask FAB (bottom-right).
2. Ask in Vietnamese or English, for example:
   - Greeting: `xin chào`
   - FAQ: `ship bao lâu?`, `đổi trả như thế nào?`, `bảo hành bao lâu?`
   - Catalog: `chè tôm`, `chè dưới 200k`, `sản phẩm rẻ nhất`
   - Corporate: `quà doanh nghiệp`
   - Complaint → escalate form: `hàng bị hỏng khi nhận`
3. Tap product cards to open PDP; tap related chips for a follow-up.
4. On escalate, leave phone and/or email → CSKH gets an inquiry.

### 9.2 Developers — local (summary)

Full first-run: **§0.5**. Short version:

```bash
./start.dev.sh
docker exec -w /workspace/apps/backend tlcv_backend npm run ask:reindex

# Unit tests (no Docker required)
cd apps/backend
npm run test:unit -- --testPathPattern=ask
```

Storefront: **http://localhost:8800** · Medusa: **:9000** · Admin: **http://localhost:9000/app**

### 9.3 Ops / CSKH

- Escalations → Admin → **Customer Inquiries**, `source: ask-messages`.
- Care-channel (Telegram/Zalo) uses the same notify path as the public contact form.
- Ask session history is **not** durable across Medusa restarts — treat escalate inquiries as SoT.
- After catalog import or Typesense volume wipe → always **reindex**.

---

## 10. Extending

| Change | File |
|--------|------|
| New FAQ / sensitive intent | `modules/ask/config/knowledge-base.ts` |
| Related chips | `modules/ask/config/related-questions.ts` |
| Synonyms / expand | `modules/ask/config/synonyms.ts` |
| Tea nouns in residual | `modules/ask/query/residual.ts` |
| Copy strings | `modules/ask/config/messages.ts` |
| Escalate sentinel text | `modules/ask/config/thresholds.ts` **and** `apps/web/utils/ask.ts` |
| UI strings | `apps/web/locales/vi.json` + `en.json` → `ask.*` |
| Typesense schema / sync mapping | `search/typesense/schemas.ts`, `sync.ts` |

Rules of thumb:

- Prefer longer, specific FAQ patterns; avoid bare ASCII tokens that collide (e.g. bare `hong`).
- Corporate FAQ needs B2B markers (“doanh nghiệp”), not bare “quà tặng”.
- Do **not** re-enable Color/Size filters without real Medusa options on tea SKUs.
- Catalog quality (title/description/image) beats n=1 regex hotfixes.
- After schema or hybrid flip: run **`ask:reindex`**.
- Add/adjust a unit test under `modules/ask/__tests__/` when changing FAQ or search mapping.

---

## 11. File map

```text
apps/backend/src/modules/ask/
  answer.ts / answer-types.ts
  service.ts
  catalog-loader.ts / catalog-context.ts
  session-store.ts / classifier.ts / types.ts / miss-log.ts
  mapper/          # rule mapper, execute, session anaphora
  query/           # classify, residual, superlative
  search/
    lib-engine.ts
    search-catalog.ts      # synonym + fail-soft + rerank entry
    keyword-search.ts      # lib engine
    catalog-query.ts
    cohere-rerank.ts
    typesense/
      client.ts
      schemas.ts
      search.ts
      sync.ts
      cohere-embed.ts
      index.ts
  config/          # FAQ, messages, thresholds, grammars, commerce
  __tests__/
    answer.unit.spec.ts
    typesense.unit.spec.ts

apps/backend/src/lib/ask-search-index.ts
apps/backend/src/subscribers/
  product-created-search-index.ts
  product-updated-search-index.ts
  product-deleted-search-index.ts
  product-variant-search-index.ts
apps/backend/src/scripts/ask-reindex.ts
apps/backend/src/api/store/ask/route.ts
apps/backend/src/api/store/ask/escalate/route.ts
apps/backend/src/api/admin/ask/reindex/route.ts
apps/backend/src/api/middlewares.ts   # reindex optional auth

apps/web/
  components/widgets/AskMessages.vue
  composables/useAsk.ts
  utils/ask.ts
  layouts/default.vue                 # mount
  pages/index.vue                     # mount (layout:false)

infra/docker-compose.yml              # typesense + backend env
infra/docker-compose.prod.yml
.env.example                          # Ask / Typesense / Cohere placeholders
```

Module registration: `apps/backend/medusa-config.ts` → `./src/modules/ask`.

---

## 12. Decisions & non-goals

Recorded in [`.ai/DECISIONS.md`](../.ai/DECISIONS.md):

| ID | Decision |
|----|----------|
| **014** | Ask = Medusa `/store/ask` + Nuxt FAB (not care-messages) |
| **015** | Ask catalog search = Typesense BM25 primary; lib keyword fail-soft |

| Decision | Rationale |
|----------|-----------|
| Medusa `/store/ask`, not Nest/Next | TLCV is Nuxt + Medusa only |
| Rule mapper only | No LLM NLU budget on soft launch |
| Typesense BM25 + lib fail-soft | Better recall; Ask stays up if Typesense dies |
| Medusa-native sync (no Next BFF) | Subscribers + `ask:reindex` inside `apps/backend` |
| Cohere = rerank + optional embed | Precision after recall; hybrid opt-in for cost |
| Separate from care-messages | Machine assistant vs human inbox |

**Non-goals:** LLM MappedPlan, gift audience/occasion facets, apparel Color/Size filtering, `tea_discovery` / content Typesense collection, durable Ask transcript DB, Kafka nightly reconcile.

---

## 13. Smoke checklist

### Functional

- [ ] Single FAB on home + inner pages
- [ ] `xin chào` → courtesy + tea-domain chips
- [ ] `ship bao lâu?` → FAQ VI
- [ ] `chè tôm` → product card(s) → PDP
- [ ] `chè dưới 200k` → price-filtered set
- [ ] `chè màu hồng` → lexical/tea path (not empty Color filter)
- [ ] `hàng bị hỏng` → escalate form → inquiry in Admin (`ask-messages`)
- [ ] Home ↔ product page → transcript restored (`sessionStorage`)

### Typesense / Cohere

- [ ] Typesense healthy; `printenv SEARCH_SOURCE` = `typesense`
- [ ] `ask:reindex` completes; `products=N` with N > 0
- [ ] `chè tôm` returns cards after reindex
- [ ] Stop Typesense → Ask still answers via **lib** fail-soft
- [ ] `COHERE_RERANK=1` + key: answers still succeed if Cohere fails
- [ ] Enable `TYPESENSE_HYBRID=1` only after BM25 PASS + Cohere key; reindex again

---

## 14. Production

Full site checklist: [`docs/GO-LIVE.md`](./GO-LIVE.md).

### Minimum Ask cutover

1. Merge branch that includes Ask + Typesense into the deploy branch.
2. Set `.env.prod` Ask/Typesense/Cohere/Telegram vars (§7). Use a **strong** `TYPESENSE_API_KEY` (same value for Typesense service + backend).
3. Confirm prod compose has `typesense` service + backend env.
4. Deploy (`./deploy.sh` / `./start.prod.sh`).
5. **Reindex** after first boot / catalog import (§5.2 prod docker exec).
6. Smoke Store + Ask + escalate; hard-refresh browser (publishable key).

### Catalog / CSKH gates

| Gate | Why |
|------|-----|
| Products **published**, VND prices, real titles | Typesense + lib rank on these fields |
| Product images | Ask cards complete |
| Care-channel Telegram seeded | Escalate → notify |
| Admin watches `source: ask-messages` | Human follow-up SoT |

### Post-deploy smoke

```bash
PK=...  # from .env.prod
curl -s -o /dev/null -w '%{http_code}\n' \
  -H "x-publishable-api-key: $PK" https://your.domain/store/site-settings

curl -s https://your.domain/store/ask \
  -H "content-type: application/json" \
  -H "x-publishable-api-key: $PK" \
  -d '{"message":"chè tôm"}'
```

Browser: hard-refresh → FAB → chào / ship / sản phẩm / escalate with phone.

### Weekly ops

- Skim escalate inquiries + care-channel failures in logs.
- Spot-check ~5 product queries after catalog edits.
- After bulk import or Typesense volume recreate → `ask:reindex`.
- Keep `COHERE_API_KEY` / `TYPESENSE_API_KEY` server-only; rotate as needed.

---

## 15. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Ask 404 | Module not in running build | Redeploy branch with `modules/ask` |
| Ask 401 / empty key | Publishable key missing in Nuxt | `setup-web-integration` + **recreate web** |
| FAB works, no / weak products | Empty Typesense / never reindexed / no published products | Publish products + `ask:reindex` |
| `ask:reindex` DNS / connection error on host | `TYPESENSE_HOST=typesense` only works in Docker | Use `docker exec … npm run ask:reindex` |
| Hits wrong after title edit | Subscriber failed | Backend logs `[ask-search-index]`; fix Typesense; reindex |
| Ask “works” but ranking weak | `COHERE_RERANK=0` or no key | Set key + `COHERE_RERANK=1`; restart backend |
| Hybrid schema errors | Embedding field added without rebuild | Reindex with hybrid ON |
| Typesense container unhealthy | Bad API key / volume | Compose logs; key must match backend |
| Escalate form never shows | Sentinel string mismatch FE/BE | Align `thresholds.ts` and `utils/ask.ts` |
| Escalate no Telegram | Care-channel not seeded | Admin CSKH / `seed:care-channel-telegram` |
| Double FAB | Ask also in `GlobalWidgets` | Remove; keep layout + homepage only |
| Session “forgotten” after deploy | In-memory Map cleared | Expected; inquiries remain |
| Prices look wrong / zero | Region / calculated_price missing | Check region + currency; Ask falls back without prices |

```bash
# Sanity in backend container
docker exec tlcv_backend printenv \
  ASK_NLU_PROVIDER SEARCH_SOURCE TYPESENSE_HOST TYPESENSE_HYBRID COHERE_RERANK

# Prod
docker exec tlcv_backend_prod printenv \
  ASK_NLU_PROVIDER SEARCH_SOURCE TYPESENSE_HYBRID COHERE_RERANK
```

---

**SSOT for Ask behavior:** this file.  
**SSOT for full site go-live:** [`docs/GO-LIVE.md`](./GO-LIVE.md).  
**Newcomers:** start at [§0](#0-start-here-newcomers).
