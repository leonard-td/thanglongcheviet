# Master Execution Plan: Modular Monolith NestJS Backend
## Thăng Long Chè Việt — CMS + CRM + Product Modules

**Version:** 1.0  
**Created:** 2026-06-27  
**Architecture:** Modular Monolith  
**Tech Stack:** NestJS + PostgreSQL (Prisma) + Redis + AWS S3

---

## Executive Summary

This Master Plan orchestrates the development of a Modular Monolith NestJS backend system across **6 Sprints** divided into **3 Phases**. The execution follows a strict dependency chain: **Base Infrastructure → CMS Module → CRM Module → Product Module**, with continuous integration testing and quality gates at each phase.

### Module Overview

| Module | Core Entities | Dependencies | Complexity |
|--------|--------------|--------------|------------|
| **Base Infrastructure** | Database, Redis, S3, Guards, Filters | None | Foundation |
| **CMS Module** | Card, SystemConfig, Newsfeed | Base | Medium |
| **CRM Module** | CustomerInquiry, InquiryNote, State Machine | Base, CMS (SystemConfig) | High |
| **Product Module** | Product, Category, ProductView, CronJobs | Base, CMS (Card cache) | Very High |

---

## Git Branching Strategy

### Branch Structure
```
main (protected)
├── develop (integration branch)
│   ├── feature/base-infrastructure
│   ├── feature/cms-module
│   ├── feature/crm-module
│   └── feature/product-module
└── hotfix/* (emergency fixes)
```

### Branch Naming Convention
```
feature/[sprint-number]-[module]-[component]
  Examples:
    - feature/sprint1-base-database-setup
    - feature/sprint2-cms-card-entity
    - feature/sprint4-crm-state-machine
    - feature/sprint6-product-cronjobs
```

### Merge Strategy
1. **Feature → Develop:** PR with mandatory code review + CI tests pass
2. **Develop → Main:** Only after Sprint DoD completion + QA sign-off
3. **Conflict Resolution:** Rebase strategy (keep linear history)
4. **Hot Fixes:** Branch from main, merge back to both main and develop

### Git Workflow Rules for AI Agents
```bash
# Agent workflow for each Sprint/feature
git checkout develop
git pull origin develop
git checkout -b feature/sprint[X]-[component]

# ... make changes ...

git add .
git commit -m "[SPRINT-X] [MODULE] Brief description"
git push origin feature/sprint[X]-[component]

# Open PR to develop (manual review required)
# After merge to develop → run integration tests
```

---

## Phase 1: Foundation (Sprints 1-2)

### Sprint 1: Base Infrastructure Setup
**Duration:** 5 days  
**Branch:** `feature/sprint1-base-infrastructure`  
**Prompt:** Base Architecture (Part 1)

#### Goals
- Set up NestJS project structure (Modular Monolith)
- Configure PostgreSQL + Prisma ORM
- Configure Redis connection
- Configure AWS S3 (presigned URLs)
- Implement global exception filters & interceptors
- Set up Swagger documentation

#### Tasks Breakdown

| Task | Component | Estimated Hours | AI Agent Role |
|------|-----------|-----------------|---------------|
| 1.1 | NestJS project initialization + folder structure | 2h | Backend Dev |
| 1.2 | Prisma setup + database connection | 3h | Database Dev |
| 1.3 | Redis module + connection service | 2h | Backend Dev |
| 1.4 | AWS S3 module + presigned URL service | 4h | Backend Dev |
| 1.5 | Global exception filter (AllExceptionsFilter) | 2h | Backend Dev |
| 1.6 | Response interceptor (TransformInterceptor) | 2h | Backend Dev |
| 1.7 | Validation pipe (class-validator) | 1h | Backend Dev |
| 1.8 | Swagger configuration | 2h | Backend Dev |
| 1.9 | Environment config (.env validation) | 2h | DevOps Dev |
| 1.10 | Logger service (Winston) | 2h | Backend Dev |

#### Deliverables
```
apps/api/
├── src/
│   ├── main.ts                      # Bootstrap with Swagger
│   ├── app.module.ts                # Root module
│   ├── config/
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   └── s3.config.ts
│   ├── common/
│   │   ├── filters/
│   │   │   └── all-exceptions.filter.ts
│   │   ├── interceptors/
│   │   │   └── transform.interceptor.ts
│   │   ├── pipes/
│   │   │   └── validation.pipe.ts
│   │   └── decorators/
│   │       ├── public.decorator.ts
│   │       └── roles.decorator.ts
│   ├── modules/
│   │   ├── database/
│   │   │   ├── database.module.ts
│   │   │   └── prisma.service.ts
│   │   ├── redis/
│   │   │   ├── redis.module.ts
│   │   │   └── redis.service.ts
│   │   └── s3/
│   │       ├── s3.module.ts
│   │       ├── s3.service.ts
│   │       └── dto/
│   │           └── presigned-url.dto.ts
│   └── utils/
│       └── logger.service.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── .env.example
└── package.json
```

#### Definition of Done (DoD)
- [x] NestJS server starts on port 3000
- [x] PostgreSQL connection successful (test query runs)
- [x] Redis connection successful (ping-pong test)
- [x] S3 presigned URL generation works (test upload)
- [x] Global exception filter catches and formats errors correctly
- [x] Swagger accessible at `/api/docs`
- [x] Environment validation fails on missing required vars
- [x] Winston logger writes to file + console
- [x] Unit tests for S3Service, RedisService, PrismaService (coverage ≥ 80%)
- [x] Code review passed (no circular dependencies, proper DI)
- [x] PR merged to `develop`

---

### Sprint 2: Authentication & Authorization
**Duration:** 4 days  
**Branch:** `feature/sprint2-base-auth`  
**Prompt:** Base Architecture (Part 2)

#### Goals
- Implement JWT-based authentication
- Set up role-based access control (RBAC)
- Create Admin user module
- Implement refresh token mechanism

#### Tasks Breakdown

| Task | Component | Estimated Hours | AI Agent Role |
|------|-----------|-----------------|---------------|
| 2.1 | User entity + Prisma schema | 2h | Database Dev |
| 2.2 | AuthModule + JWT strategy | 4h | Backend Dev |
| 2.3 | Login/Register endpoints | 3h | Backend Dev |
| 2.4 | Refresh token logic | 3h | Backend Dev |
| 2.5 | JwtAuthGuard + RolesGuard | 3h | Backend Dev |
| 2.6 | Password hashing (bcrypt) | 1h | Backend Dev |
| 2.7 | Admin user CRUD | 2h | Backend Dev |
| 2.8 | Swagger auth decorators | 2h | Backend Dev |

#### Prisma Schema (Sprint 2)
```prisma
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  passwordHash  String   @map("password_hash")
  role          UserRole @default(ADMIN)
  refreshToken  String?  @map("refresh_token")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@map("users")
}

enum UserRole {
  ADMIN
  CUSTOMER // For future CRM use
}
```

#### Deliverables
```
apps/api/src/modules/
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/
│   │   └── jwt.strategy.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   └── dto/
│       ├── login.dto.ts
│       ├── register.dto.ts
│       └── refresh-token.dto.ts
└── users/
    ├── users.module.ts
    ├── users.controller.ts
    ├── users.service.ts
    └── dto/
        └── create-user.dto.ts
```

#### Definition of Done (DoD)
- [x] `/auth/login` returns JWT + refresh token
- [x] `/auth/refresh` returns new JWT on valid refresh token
- [x] Protected routes reject requests without JWT
- [x] `@Roles('ADMIN')` decorator works correctly
- [x] Passwords are hashed with bcrypt (salt rounds = 10)
- [x] Unit tests for AuthService, UsersService (coverage ≥ 80%)
- [x] Integration tests for login flow (E2E)
- [x] Swagger shows lock icon on protected endpoints
- [x] Code review passed
- [x] PR merged to `develop`
- [x] Migration to `main` (Base Infrastructure Complete)

---

## Phase 2: CMS Module (Sprint 3)

### Sprint 3: CMS - Card, SystemConfig, Newsfeed
**Duration:** 6 days  
**Branch:** `feature/sprint3-cms-module`  
**Prompt:** CMS Module (Full Implementation)

#### Goals
- Implement Card entity (multi-language support)
- Implement SystemConfig (key-value store with typing)
- Implement Newsfeed entity (pagination + filtering)
- Add Redis caching for all public read endpoints

#### Tasks Breakdown

| Task | Component | Estimated Hours | AI Agent Role |
|------|-----------|-----------------|---------------|
| 3.1 | Card entity + Prisma schema (translations JSONB) | 3h | Database Dev |
| 3.2 | CardModule + CRUD operations | 4h | Backend Dev |
| 3.3 | SystemConfig entity + Prisma schema | 2h | Database Dev |
| 3.4 | SystemConfigModule + type-safe getters | 5h | Backend Dev |
| 3.5 | Newsfeed entity + Prisma schema | 3h | Database Dev |
| 3.6 | NewsfeedModule + pagination/filter | 4h | Backend Dev |
| 3.7 | Redis caching strategy (public endpoints) | 4h | Backend Dev |
| 3.8 | Cache invalidation on admin updates | 3h | Backend Dev |
| 3.9 | Image upload integration (S3 presigned) | 3h | Backend Dev |
| 3.10 | Swagger documentation for CMS APIs | 2h | Backend Dev |

#### Prisma Schema (Sprint 3)
```prisma
model Card {
  id           String      @id @default(uuid())
  category     CardCategory
  translations Json        @default("{}") // {vi:{title,subtitle,description},en:{...}}
  image        String?
  linkUrl      String?     @map("link_url")
  sortOrder    Int         @default(0) @map("sort_order")
  status       CardStatus  @default(DRAFT)
  publishedAt  DateTime?   @map("published_at")
  createdAt    DateTime    @default(now()) @map("created_at")
  updatedAt    DateTime    @updatedAt @map("updated_at")

  @@index([category, status])
  @@map("cards")
}

enum CardCategory {
  HERO_SLIDER
  SERVICE_HIGHLIGHT
  PROMOTION
  TESTIMONIAL
}

enum CardStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

model SystemConfig {
  id          String   @id @default(uuid())
  key         String   @unique
  value       String   // JSON stringified for complex types
  valueType   String   @map("value_type") // 'string' | 'number' | 'boolean' | 'json'
  description String?
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("system_configs")
}

model Newsfeed {
  id           String        @id @default(uuid())
  translations Json          @default("{}") // {vi:{title,content,excerpt},en:{...}}
  category     String
  image        String?
  authorId     String        @map("author_id")
  author       User          @relation(fields: [authorId], references: [id])
  tags         String[]      @default([])
  viewCount    Int           @default(0) @map("view_count")
  status       NewsfeedStatus @default(DRAFT)
  publishedAt  DateTime?     @map("published_at")
  createdAt    DateTime      @default(now()) @map("created_at")
  updatedAt    DateTime      @updatedAt @map("updated_at")

  @@index([category, status])
  @@index([publishedAt])
  @@map("newsfeeds")
}

enum NewsfeedStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}
```

#### Deliverables
```
apps/api/src/modules/cms/
├── cards/
│   ├── cards.module.ts
│   ├── cards.controller.ts
│   ├── cards.service.ts
│   ├── entities/
│   │   └── card.entity.ts
│   └── dto/
│       ├── create-card.dto.ts
│       ├── update-card.dto.ts
│       └── query-card.dto.ts
├── system-config/
│   ├── system-config.module.ts
│   ├── system-config.controller.ts
│   ├── system-config.service.ts
│   └── dto/
│       ├── set-config.dto.ts
│       └── config-value.dto.ts
└── newsfeed/
    ├── newsfeed.module.ts
    ├── newsfeed.controller.ts
    ├── newsfeed.service.ts
    └── dto/
        ├── create-newsfeed.dto.ts
        ├── update-newsfeed.dto.ts
        └── query-newsfeed.dto.ts
```

#### Definition of Done (DoD)
- [x] CRUD operations for Card, SystemConfig, Newsfeed work correctly
- [x] Public GET endpoints cached in Redis (TTL: 300s)
- [x] Cache invalidated on admin POST/PUT/DELETE
- [x] Translations JSONB structure validated (vi required, en optional)
- [x] Image upload returns presigned URL (S3)
- [x] Newsfeed pagination works (limit, offset, total count)
- [x] Newsfeed filtering by category, status, tags
- [x] SystemConfig type-safe getters (getString, getNumber, getBoolean, getJson)
- [x] Unit tests for all services (coverage ≥ 80%)
- [x] Integration tests for cache invalidation
- [x] Swagger documentation complete with examples
- [x] Code review passed (check module boundaries)
- [x] PR merged to `develop`

---

## Phase 3: CRM + Product Modules (Sprints 4-6)

### Sprint 4: CRM - Customer Inquiry & State Machine
**Duration:** 7 days  
**Branch:** `feature/sprint4-crm-module`  
**Prompt:** CRM Module (Full Implementation)

#### Goals
- Implement CustomerInquiry entity (form submissions)
- Implement InquiryNote entity (admin notes)
- Implement State Machine for inquiry status transitions
- Add email notification service (send to admin on new inquiry)

#### Tasks Breakdown

| Task | Component | Estimated Hours | AI Agent Role |
|------|-----------|-----------------|---------------|
| 4.1 | CustomerInquiry entity + Prisma schema | 3h | Database Dev |
| 4.2 | InquiryNote entity + Prisma schema | 2h | Database Dev |
| 4.3 | InquiryModule + CRUD operations | 4h | Backend Dev |
| 4.4 | State Machine implementation (FSM pattern) | 6h | Backend Dev |
| 4.5 | Public inquiry submission endpoint (rate-limited) | 3h | Backend Dev |
| 4.6 | Admin endpoints (list, detail, add note, change status) | 4h | Backend Dev |
| 4.7 | Email notification service (Nodemailer/SES) | 4h | Backend Dev |
| 4.8 | BullMQ job queue for async email sending | 4h | Backend Dev |
| 4.9 | Admin notification on new inquiry | 2h | Backend Dev |
| 4.10 | Swagger documentation for CRM APIs | 2h | Backend Dev |

#### State Machine Diagram
```
[NEW] ──→ [REVIEWING] ──→ [IN_PROGRESS] ──→ [RESOLVED]
  │            │                │               │
  └────────────┴────────────────┴──────────→ [CLOSED]
                                                │
                                                ↓
                                            [ARCHIVED]

Valid Transitions:
  NEW → REVIEWING, CLOSED
  REVIEWING → IN_PROGRESS, CLOSED
  IN_PROGRESS → RESOLVED, REVIEWING, CLOSED
  RESOLVED → CLOSED
  CLOSED → ARCHIVED (auto after 90 days)
```

#### Prisma Schema (Sprint 4)
```prisma
model CustomerInquiry {
  id            String          @id @default(uuid())
  customerName  String          @map("customer_name")
  customerEmail String          @map("customer_email")
  customerPhone String?         @map("customer_phone")
  subject       String
  message       String          @db.Text
  source        InquirySource   @default(CONTACT_FORM)
  status        InquiryStatus   @default(NEW)
  priority      InquiryPriority @default(NORMAL)
  assignedToId  String?         @map("assigned_to_id")
  assignedTo    User?           @relation(fields: [assignedToId], references: [id])
  notes         InquiryNote[]
  statusHistory InquiryStatusHistory[]
  createdAt     DateTime        @default(now()) @map("created_at")
  updatedAt     DateTime        @updatedAt @map("updated_at")

  @@index([status, priority])
  @@index([customerEmail])
  @@map("customer_inquiries")
}

model InquiryNote {
  id         String           @id @default(uuid())
  inquiryId  String           @map("inquiry_id")
  inquiry    CustomerInquiry  @relation(fields: [inquiryId], references: [id], onDelete: Cascade)
  authorId   String           @map("author_id")
  author     User             @relation(fields: [authorId], references: [id])
  content    String           @db.Text
  isInternal Boolean          @default(true) @map("is_internal")
  createdAt  DateTime         @default(now()) @map("created_at")

  @@index([inquiryId])
  @@map("inquiry_notes")
}

model InquiryStatusHistory {
  id         String           @id @default(uuid())
  inquiryId  String           @map("inquiry_id")
  inquiry    CustomerInquiry  @relation(fields: [inquiryId], references: [id], onDelete: Cascade)
  fromStatus InquiryStatus    @map("from_status")
  toStatus   InquiryStatus    @map("to_status")
  changedBy  String           @map("changed_by")
  user       User             @relation(fields: [changedBy], references: [id])
  reason     String?
  createdAt  DateTime         @default(now()) @map("created_at")

  @@index([inquiryId])
  @@map("inquiry_status_history")
}

enum InquiryStatus {
  NEW
  REVIEWING
  IN_PROGRESS
  RESOLVED
  CLOSED
  ARCHIVED
}

enum InquirySource {
  CONTACT_FORM
  PHONE
  EMAIL
  CHAT
  SOCIAL_MEDIA
}

enum InquiryPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}
```

#### State Machine Implementation
```typescript
// apps/api/src/modules/crm/inquiry-state-machine/inquiry-state.machine.ts
export class InquiryStateMachine {
  private static transitions: Record<InquiryStatus, InquiryStatus[]> = {
    NEW: ['REVIEWING', 'CLOSED'],
    REVIEWING: ['IN_PROGRESS', 'CLOSED'],
    IN_PROGRESS: ['RESOLVED', 'REVIEWING', 'CLOSED'],
    RESOLVED: ['CLOSED'],
    CLOSED: ['ARCHIVED'],
    ARCHIVED: []
  }

  static canTransition(from: InquiryStatus, to: InquiryStatus): boolean {
    return this.transitions[from]?.includes(to) ?? false
  }

  static getValidTransitions(currentStatus: InquiryStatus): InquiryStatus[] {
    return this.transitions[currentStatus] ?? []
  }
}
```

#### Deliverables
```
apps/api/src/modules/crm/
├── inquiry/
│   ├── inquiry.module.ts
│   ├── inquiry.controller.ts
│   ├── inquiry.service.ts
│   ├── inquiry-state.machine.ts
│   └── dto/
│       ├── create-inquiry.dto.ts
│       ├── update-inquiry-status.dto.ts
│       ├── add-note.dto.ts
│       └── query-inquiry.dto.ts
├── notification/
│   ├── notification.module.ts
│   ├── notification.service.ts
│   └── processors/
│       └── email.processor.ts
└── queue/
    └── bullmq.config.ts
```

#### Definition of Done (DoD)
- [x] Public `/crm/inquiry/submit` endpoint rate-limited (5 req/IP/hour)
- [x] State machine validates all status transitions
- [x] Invalid transition throws `BadRequestException` with reason
- [x] InquiryStatusHistory tracks all status changes + reason
- [x] Email notification sent to admin on new inquiry (async via BullMQ)
- [x] Admin can list inquiries with filters (status, priority, assignee)
- [x] Admin can add notes (internal/public flag)
- [x] Admin can change status with reason
- [x] Unit tests for InquiryStateMachine (all transition rules)
- [x] Unit tests for InquiryService (coverage ≥ 80%)
- [x] Integration test for email queue
- [x] Swagger documentation complete
- [x] Code review passed (check state machine logic)
- [x] PR merged to `develop`

---

### Sprint 5: Product Module - Catalog & Redis Tracking
**Duration:** 8 days  
**Branch:** `feature/sprint5-product-module`  
**Prompt:** Product Module (Part 1)

#### Goals
- Implement Product & Category entities
- Implement ProductView tracking (Redis-based)
- Implement product search & filtering
- Add Redis cache for product catalog

#### Tasks Breakdown

| Task | Component | Estimated Hours | AI Agent Role |
|------|-----------|-----------------|---------------|
| 5.1 | Category entity + Prisma schema (tree structure) | 3h | Database Dev |
| 5.2 | Product entity + Prisma schema (variants, pricing) | 4h | Database Dev |
| 5.3 | ProductModule + CRUD operations | 5h | Backend Dev |
| 5.4 | CategoryModule + tree operations | 4h | Backend Dev |
| 5.5 | Product search & filtering (price, category, tags) | 5h | Backend Dev |
| 5.6 | Redis view tracking (productId → count) | 4h | Backend Dev |
| 5.7 | ProductViewService (increment, get stats) | 3h | Backend Dev |
| 5.8 | Public product endpoints (cached) | 3h | Backend Dev |
| 5.9 | Admin product endpoints (cache invalidation) | 3h | Backend Dev |
| 5.10 | Image upload for products (multiple images) | 3h | Backend Dev |
| 5.11 | Swagger documentation for Product APIs | 2h | Backend Dev |

#### Prisma Schema (Sprint 5)
```prisma
model Category {
  id           String     @id @default(uuid())
  parentId     String?    @map("parent_id")
  parent       Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children     Category[] @relation("CategoryTree")
  translations Json       @default("{}") // {vi:{name,description},en:{...}}
  slug         String     @unique
  image        String?
  sortOrder    Int        @default(0) @map("sort_order")
  products     Product[]
  createdAt    DateTime   @default(now()) @map("created_at")
  updatedAt    DateTime   @updatedAt @map("updated_at")

  @@index([parentId])
  @@map("categories")
}

model Product {
  id           String        @id @default(uuid())
  sku          String        @unique
  categoryId   String        @map("category_id")
  category     Category      @relation(fields: [categoryId], references: [id])
  translations Json          @default("{}") // {vi:{name,description,shortDescription},en:{...}}
  images       String[]      @default([])
  price        Decimal       @db.Decimal(10, 2)
  comparePrice Decimal?      @map("compare_price") @db.Decimal(10, 2)
  cost         Decimal?      @db.Decimal(10, 2)
  stock        Int           @default(0)
  tags         String[]      @default([])
  status       ProductStatus @default(DRAFT)
  publishedAt  DateTime?     @map("published_at")
  createdAt    DateTime      @default(now()) @map("created_at")
  updatedAt    DateTime      @updatedAt @map("updated_at")

  @@index([categoryId, status])
  @@index([sku])
  @@map("products")
}

enum ProductStatus {
  DRAFT
  PUBLISHED
  OUT_OF_STOCK
  ARCHIVED
}
```

#### Redis Data Structure (View Tracking)
```
Key Pattern: product:views:{productId}:{YYYY-MM-DD}
Type: String (counter)
TTL: 90 days

Example:
  product:views:uuid-123:2026-06-27 → "42"
  product:views:uuid-123:2026-06-26 → "38"

Aggregation Key: product:views:total:{productId}
Type: String (counter)
TTL: None (permanent, updated on flush)
```

#### Deliverables
```
apps/api/src/modules/product/
├── category/
│   ├── category.module.ts
│   ├── category.controller.ts
│   ├── category.service.ts
│   └── dto/
│       ├── create-category.dto.ts
│       └── update-category.dto.ts
├── product/
│   ├── product.module.ts
│   ├── product.controller.ts
│   ├── product.service.ts
│   └── dto/
│       ├── create-product.dto.ts
│       ├── update-product.dto.ts
│       └── query-product.dto.ts
└── product-view/
    ├── product-view.module.ts
    ├── product-view.service.ts
    └── dto/
        └── view-stats.dto.ts
```

#### Definition of Done (DoD)
- [x] CRUD operations for Product & Category work correctly
- [x] Category tree structure supports infinite depth
- [x] Product search by name, tags, category (full-text)
- [x] Product filtering by price range, category, status
- [x] View tracking increments Redis counter on product detail view
- [x] ProductViewService returns total views + daily breakdown
- [x] Public product endpoints cached in Redis (TTL: 300s)
- [x] Cache invalidated on admin product updates
- [x] Multiple images supported (array of S3 URLs)
- [x] Unit tests for ProductService, CategoryService (coverage ≥ 80%)
- [x] Integration test for Redis view tracking
- [x] Swagger documentation complete
- [x] Code review passed
- [x] PR merged to `develop`

---

### Sprint 6: Product Module - CronJobs & Analytics
**Duration:** 6 days  
**Branch:** `feature/sprint6-product-cronjobs`  
**Prompt:** Product Module (Part 2)

#### Goals
- Implement daily view data flush (Redis → PostgreSQL)
- Implement weekly analytics aggregation
- Implement auto-archival of old products
- Add admin analytics dashboard endpoints

#### Tasks Breakdown

| Task | Component | Estimated Hours | AI Agent Role |
|------|-----------|-----------------|---------------|
| 6.1 | ProductViewLog entity + Prisma schema | 2h | Database Dev |
| 6.2 | Daily flush CronJob (Redis → DB) | 5h | Backend Dev |
| 6.3 | Weekly aggregation CronJob | 4h | Backend Dev |
| 6.4 | Auto-archival CronJob (30 days no views) | 3h | Backend Dev |
| 6.5 | Analytics service (top products, trends) | 4h | Backend Dev |
| 6.6 | Admin analytics endpoints | 3h | Backend Dev |
| 6.7 | CronJob error handling + retry logic | 3h | Backend Dev |
| 6.8 | CronJob monitoring (logs, alerts) | 2h | DevOps Dev |
| 6.9 | Integration tests for CronJobs (mocked time) | 4h | Backend Dev |
| 6.10 | Swagger documentation for Analytics APIs | 2h | Backend Dev |

#### Prisma Schema (Sprint 6)
```prisma
model ProductViewLog {
  id         String   @id @default(uuid())
  productId  String   @map("product_id")
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  date       DateTime @db.Date
  viewCount  Int      @map("view_count")
  createdAt  DateTime @default(now()) @map("created_at")

  @@unique([productId, date])
  @@index([productId])
  @@index([date])
  @@map("product_view_logs")
}
```

#### CronJob Schedule
```typescript
// apps/api/src/modules/product/cron/product-cron.service.ts
@Injectable()
export class ProductCronService {
  @Cron('0 2 * * *') // Daily at 2:00 AM
  async flushDailyViews() { ... }

  @Cron('0 3 * * 0') // Weekly on Sunday at 3:00 AM
  async aggregateWeeklyStats() { ... }

  @Cron('0 4 1 * *') // Monthly on 1st at 4:00 AM
  async archiveOldProducts() { ... }
}
```

#### Deliverables
```
apps/api/src/modules/product/
├── cron/
│   ├── product-cron.module.ts
│   ├── product-cron.service.ts
│   └── jobs/
│       ├── flush-views.job.ts
│       ├── aggregate-stats.job.ts
│       └── archive-products.job.ts
├── analytics/
│   ├── analytics.module.ts
│   ├── analytics.controller.ts
│   ├── analytics.service.ts
│   └── dto/
│       ├── top-products.dto.ts
│       └── trend-stats.dto.ts
└── view-log/
    ├── view-log.module.ts
    └── view-log.service.ts
```

#### Definition of Done (DoD)
- [x] Daily CronJob flushes Redis data to ProductViewLog table
- [x] Redis keys deleted after successful flush
- [x] Weekly CronJob aggregates top products (by views)
- [x] Monthly CronJob archives products with 0 views in 30 days
- [x] Analytics endpoint returns top 10 products (weekly, monthly, all-time)
- [x] Analytics endpoint returns view trends (daily breakdown for date range)
- [x] CronJob errors logged to Winston + Slack notification (optional)
- [x] CronJob retry logic (3 retries with exponential backoff)
- [x] Unit tests for CronJob logic (coverage ≥ 80%)
- [x] Integration test with mocked time (simulate daily flush)
- [x] Swagger documentation complete
- [x] Code review passed (check DB transaction handling)
- [x] PR merged to `develop`
- [x] Migration to `main` (All modules complete)

---

## Cross-Module Integration

### Shared Types & DTOs
```
packages/shared/
├── types/
│   ├── user.types.ts
│   ├── cms.types.ts
│   ├── crm.types.ts
│   └── product.types.ts
├── dto/
│   ├── pagination.dto.ts
│   ├── response.dto.ts
│   └── translations.dto.ts
└── utils/
    ├── validators.ts
    └── helpers.ts
```

### Module Interaction Rules
1. **CMS → CRM:** SystemConfig can store CRM settings (e.g., admin email for notifications)
2. **CMS → Product:** Card entity can reference Product IDs for promotions
3. **CRM → Product:** CustomerInquiry can include productId for product-specific inquiries
4. **Product → CMS:** Product views can trigger Newsfeed auto-generation (trending products)

### Dependency Injection Best Practices
```typescript
// ❌ BAD: Circular dependency
// cms.module.ts imports crm.module.ts
// crm.module.ts imports cms.module.ts

// ✅ GOOD: One-way dependency through shared module
// cms.module.ts exports SystemConfigService
// crm.module.ts imports CmsModule (one-way)
```

### Integration Testing Strategy
```typescript
// tests/integration/modules/cross-module.spec.ts
describe('Cross-Module Integration', () => {
  it('CRM should read SystemConfig from CMS', async () => {
    const config = await systemConfigService.getString('crm.admin_email')
    expect(config).toBe('admin@example.com')
  })

  it('Product cache should invalidate when Card references change', async () => {
    // Update Card with productId
    // Verify product cache is invalidated
  })
})
```

---

## Database Migration Strategy

### Migration Workflow
```bash
# AI Agent workflow for schema changes
cd apps/api

# 1. Modify prisma/schema.prisma
# 2. Generate migration
npx prisma migrate dev --name add_customer_inquiry_table

# 3. Review generated SQL in prisma/migrations/
# 4. Test migration in local DB
npx prisma migrate reset # WARNING: Drops all data

# 5. Commit migration files
git add prisma/
git commit -m "[MIGRATION] Add customer_inquiry table"
```

### Migration Naming Convention
```
YYYYMMDD_HHmmss_descriptive_name.sql

Examples:
  20260627_120000_initial_setup.sql
  20260628_140000_add_customer_inquiry_table.sql
  20260629_090000_add_product_view_log_index.sql
```

### Migration Rollback Plan
```sql
-- Each migration must include rollback SQL in comments
-- apps/api/prisma/migrations/XXXXXX_add_inquiry_table/migration.sql

-- ROLLBACK:
-- DROP TABLE IF EXISTS "inquiry_notes";
-- DROP TABLE IF EXISTS "customer_inquiries";
-- DROP TYPE IF EXISTS "InquiryStatus";
```

### Production Migration Checklist
- [ ] Backup database before migration
- [ ] Test migration in staging environment
- [ ] Estimate migration time (use `EXPLAIN ANALYZE`)
- [ ] Schedule migration during low-traffic window
- [ ] Monitor migration progress (no locks on tables)
- [ ] Verify data integrity post-migration
- [ ] Rollback plan tested and documented

---

## Quality Control & Code Review

### Code Review Checklist (Per Sprint)

#### Architecture
- [ ] Module follows Modular Monolith principles (no cross-module imports except through public API)
- [ ] Dependency Injection used correctly (no `new` keyword for services)
- [ ] No circular dependencies (check with `madge --circular src/`)
- [ ] DTOs use `class-validator` decorators
- [ ] Entities mapped correctly in Prisma schema

#### Performance
- [ ] Public endpoints cached in Redis (if applicable)
- [ ] Cache invalidation logic correct
- [ ] N+1 query problems avoided (check Prisma queries)
- [ ] Indexes added for frequently queried columns
- [ ] Large result sets paginated

#### Security
- [ ] All admin endpoints protected with `@UseGuards(JwtAuthGuard)`
- [ ] User input validated with DTOs
- [ ] SQL injection prevented (Prisma ORM used correctly)
- [ ] Rate limiting applied to public form submissions
- [ ] Sensitive data not logged (passwords, tokens)

#### Testing
- [ ] Unit test coverage ≥ 80%
- [ ] Integration tests for critical flows
- [ ] Mocking done correctly (avoid testing implementation details)
- [ ] Test database cleaned between tests

#### Documentation
- [ ] Swagger annotations on all endpoints
- [ ] README updated with module purpose
- [ ] API examples provided in Swagger
- [ ] Env vars documented in `.env.example`

### Architectural Linting Tools
```json
// package.json
{
  "scripts": {
    "lint:arch": "madge --circular src/",
    "lint:deps": "depcruise --validate .dependency-cruiser.js src",
    "lint:code": "eslint src/ --ext .ts",
    "lint:format": "prettier --check src/"
  }
}
```

### Code Review Process
1. **Self-Review:** AI Agent runs all linters before PR
2. **Automated Review:** GitHub Actions runs tests + linters
3. **Peer Review:** Senior dev reviews architecture decisions
4. **QA Review:** Test engineer verifies DoD checklist
5. **Approval Required:** 2 approvals before merge to `develop`

---

## Risk Management

### Identified Risks & Mitigation

| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|---------------------|
| **Redis data loss** | High | Medium | Daily Redis backup + RDB persistence enabled |
| **PostgreSQL migration lock** | High | Low | Test migrations in staging + run during low traffic |
| **CronJob failure** | Medium | Medium | Retry logic + Slack alerts + manual retry endpoint |
| **Circular dependencies** | High | Medium | Madge CI check + architectural review |
| **N+1 query performance** | Medium | High | Prisma query logging + load testing |
| **JWT token compromise** | High | Low | Short expiry (15min) + refresh token rotation |
| **Rate limit bypass** | Medium | Medium | IP + fingerprint combo + CAPTCHA on forms |
| **S3 upload failure** | Low | Low | Presigned URL retry + client-side validation |

### Contingency Plans

#### Scenario: Redis Crash During High Traffic
1. Enable Redis Sentinel/Cluster (Phase 2)
2. Fallback to PostgreSQL for view tracking (slower but functional)
3. Queue view data in BullMQ, flush when Redis recovers

#### Scenario: Database Migration Fails in Production
1. Rollback migration using documented SQL
2. Restore database from backup
3. Fix migration in hotfix branch
4. Re-test in staging before retry

#### Scenario: CronJob Stuck/Deadlock
1. Manual `/admin/cron/force-stop` endpoint
2. Clear Redis locks
3. Retry job manually via `/admin/cron/retry/:jobId`

---

## Testing Strategy

### Test Pyramid

```
         /\
        /E2E\       10% - Full flow tests (Postman/Playwright)
       /------\
      /  INT   \    30% - Module integration tests
     /----------\
    /   UNIT     \  60% - Service/Controller unit tests
   /--------------\
```

### Unit Test Requirements
```typescript
// Example: InquiryService unit test
describe('InquiryService', () => {
  it('should create inquiry and enqueue email', async () => {
    const dto = { customerName: 'John', ... }
    const result = await service.createInquiry(dto)
    
    expect(result.id).toBeDefined()
    expect(mockEmailQueue.add).toHaveBeenCalledWith('new-inquiry', dto)
  })

  it('should throw error on invalid status transition', async () => {
    await expect(
      service.updateStatus('uuid', { from: 'NEW', to: 'ARCHIVED' })
    ).rejects.toThrow('Invalid transition')
  })
})
```

### Integration Test Requirements
```typescript
// Example: Product view tracking integration test
describe('Product View Tracking (Integration)', () => {
  it('should increment Redis counter and flush to DB', async () => {
    // Increment view
    await request(app.getHttpServer())
      .post('/api/product/view/uuid-123')
      .expect(200)
    
    // Check Redis
    const redisCount = await redis.get('product:views:uuid-123:2026-06-27')
    expect(redisCount).toBe('1')
    
    // Run CronJob manually
    await cronService.flushDailyViews()
    
    // Check DB
    const dbLog = await prisma.productViewLog.findFirst({
      where: { productId: 'uuid-123', date: new Date('2026-06-27') }
    })
    expect(dbLog.viewCount).toBe(1)
  })
})
```

### E2E Test Requirements
```typescript
// Example: Full inquiry submission flow
describe('Customer Inquiry Flow (E2E)', () => {
  it('should submit inquiry, send email, and admin can review', async () => {
    // 1. Submit inquiry
    const { body } = await request(app.getHttpServer())
      .post('/api/crm/inquiry/submit')
      .send({ customerName: 'Jane', message: 'Help' })
      .expect(201)
    
    // 2. Wait for email queue (use test helpers to speed up)
    await waitForQueue(emailQueue)
    expect(mockMailer.sendMail).toHaveBeenCalled()
    
    // 3. Admin login
    const { body: auth } = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'test' })
    
    // 4. Admin reviews inquiry
    const { body: inquiry } = await request(app.getHttpServer())
      .get(`/api/crm/inquiry/${body.id}`)
      .set('Authorization', `Bearer ${auth.accessToken}`)
      .expect(200)
    
    expect(inquiry.status).toBe('NEW')
  })
})
```

---

## Deployment & CI/CD

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [develop, main]
  pull_request:
    branches: [develop, main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npx prisma migrate deploy
      - run: npm run test:cov
      - run: npm run lint:arch
      - run: npm run lint:code

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to VPS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /var/www/thanglongcheviet
            git pull origin main
            docker-compose down
            docker-compose up -d --build
            docker-compose exec -T api npx prisma migrate deploy
```

### Deployment Checklist
- [ ] All tests passing in CI
- [ ] Database backup created
- [ ] Migrations tested in staging
- [ ] Environment variables updated in production
- [ ] Redis persistence enabled
- [ ] Nginx SSL certificates valid
- [ ] Health check endpoint (`/api/health`) returns 200
- [ ] Rollback plan documented

---

## Monitoring & Observability

### Metrics to Track
```typescript
// apps/api/src/modules/monitoring/metrics.service.ts
export class MetricsService {
  trackApiRequest(endpoint: string, statusCode: number, duration: number) {
    // Log to Winston + send to monitoring service
  }

  trackCronJobExecution(jobName: string, success: boolean, duration: number) {
    // Alert if job fails or takes too long
  }

  trackCacheHitRate(endpoint: string, hit: boolean) {
    // Monitor Redis cache effectiveness
  }
}
```

### Logging Standards
```typescript
// All logs must include:
logger.info('Customer inquiry created', {
  inquiryId: inquiry.id,
  customerEmail: inquiry.customerEmail,
  source: inquiry.source,
  timestamp: new Date().toISOString()
})

// Error logs must include stack trace
logger.error('Failed to send email', {
  error: err.message,
  stack: err.stack,
  inquiryId: inquiry.id
})
```

### Health Check Endpoint
```typescript
// apps/api/src/health/health.controller.ts
@Controller('health')
export class HealthController {
  @Get()
  async check(): Promise<HealthStatus> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: await this.checkDatabase(),
        redis: await this.checkRedis(),
        s3: await this.checkS3()
      }
    }
  }
}
```

---

## Sprint Gantt Chart

```
Sprint 1: ████████░░░░░░░░░░░░ (Week 1: Days 1-5)
Sprint 2: ░░░░░░░░████████░░░░░░ (Week 1-2: Days 6-9)
Sprint 3: ░░░░░░░░░░░░░████████████ (Week 2-3: Days 10-15)
Sprint 4: ░░░░░░░░░░░░░░░░░░████████████░░ (Week 3-4: Days 16-22)
Sprint 5: ░░░░░░░░░░░░░░░░░░░░░░░░████████████████ (Week 4-5: Days 23-30)
Sprint 6: ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████████████ (Week 5-6: Days 31-36)
```

**Total Duration:** 36 working days (~7.2 weeks)

---

## Success Criteria

### Phase 1 (Sprints 1-2) — Base Infrastructure
✅ PostgreSQL, Redis, S3 all connected  
✅ JWT authentication working  
✅ Swagger documentation live  
✅ All unit tests passing (coverage ≥ 80%)

### Phase 2 (Sprint 3) — CMS Module
✅ Card, SystemConfig, Newsfeed CRUD complete  
✅ Redis caching working for public endpoints  
✅ Multi-language support (vi/en) functional  
✅ Integration tests passing

### Phase 3 (Sprints 4-6) — CRM + Product Modules
✅ Customer inquiry submission working  
✅ State machine enforcing valid transitions  
✅ Email notifications sending (async)  
✅ Product catalog with search/filter  
✅ Redis view tracking functional  
✅ CronJobs running on schedule  
✅ Analytics dashboard endpoints live  
✅ All E2E tests passing

### Final Acceptance Criteria
- [ ] All 6 sprints completed with DoD satisfied
- [ ] Zero critical bugs in production
- [ ] API response time < 200ms (90th percentile)
- [ ] Cache hit rate > 80% for public endpoints
- [ ] Database queries optimized (no N+1)
- [ ] Code coverage ≥ 80% across all modules
- [ ] Swagger documentation 100% complete
- [ ] Production deployment successful
- [ ] Health check endpoint returns all services OK

---

## Handover to AI Developer Agents

### Agent Roles & Responsibilities

| Agent | Primary Tasks | Secondary Tasks |
|-------|---------------|-----------------|
| **Backend Dev 1** | Sprints 1-2 (Base + Auth) | Code review for Sprints 3-4 |
| **Backend Dev 2** | Sprint 3 (CMS Module) | Integration tests |
| **Backend Dev 3** | Sprint 4 (CRM Module) | State machine logic |
| **Backend Dev 4** | Sprints 5-6 (Product Module) | CronJob implementation |
| **Database Dev** | Prisma schema design (all sprints) | Migration reviews |
| **DevOps Dev** | CI/CD pipeline + deployment | Monitoring setup |

### Communication Protocol
- **Daily Standups:** Share progress, blockers, next steps
- **PR Reviews:** Tag reviewer in PR description, respond within 4 hours
- **Blockers:** Escalate to Tech Lead immediately if blocked > 2 hours
- **Documentation:** Update README in each module after feature completion

### Starting Instructions for Agents
```bash
# 1. Clone repository
git clone git@github.com:leonard-td/thanglongcheviet.git
cd thanglongcheviet

# 2. Checkout develop branch
git checkout develop

# 3. Create feature branch (see Git Branching Strategy)
git checkout -b feature/sprint1-base-database-setup

# 4. Install dependencies
npm install

# 5. Set up environment
cp apps/api/.env.example apps/api/.env
# Fill in PostgreSQL, Redis, S3 credentials

# 6. Run migrations
cd apps/api
npx prisma migrate dev

# 7. Start development server
npm run start:dev

# 8. Access Swagger
# Open http://localhost:3000/api/docs

# 9. Run tests
npm run test:watch

# 10. Commit & push when ready
git add .
git commit -m "[SPRINT-1] [BASE] Set up PostgreSQL + Prisma"
git push origin feature/sprint1-base-database-setup
```

---

## Appendix

### Glossary
- **DoD:** Definition of Done
- **FSM:** Finite State Machine
- **RBAC:** Role-Based Access Control
- **TTL:** Time to Live (Redis cache expiration)
- **E2E:** End-to-End testing

### References
- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Redis Documentation](https://redis.io/docs)
- [BullMQ Documentation](https://docs.bullmq.io)

### Contact
- **Tech Lead:** [Your Name]
- **Project Manager:** [PM Name]
- **QA Lead:** [QA Name]

---

## Implementation TODO Checklist

### 🎯 Phase 1: Foundation (Sprints 1-2)

#### Sprint 1: Base Infrastructure Setup
- [ ] **1.1** Initialize NestJS project with Modular Monolith structure
- [ ] **1.2** Set up Prisma ORM + PostgreSQL connection
- [ ] **1.3** Configure Redis module and connection service
- [ ] **1.4** Implement AWS S3 module with presigned URL service
- [ ] **1.5** Create global exception filter (AllExceptionsFilter)
- [ ] **1.6** Create response interceptor (TransformInterceptor)
- [ ] **1.7** Set up validation pipe with class-validator
- [ ] **1.8** Configure Swagger documentation
- [ ] **1.9** Set up environment configuration with validation
- [ ] **1.10** Implement Winston logger service
- [ ] **1.11** Write unit tests for S3Service, RedisService, PrismaService
- [ ] **1.12** Code review and merge to `develop`

#### Sprint 2: Authentication & Authorization
- [ ] **2.1** Create User entity and Prisma schema
- [ ] **2.2** Implement AuthModule with JWT strategy
- [ ] **2.3** Create login/register endpoints
- [ ] **2.4** Implement refresh token mechanism
- [ ] **2.5** Create JwtAuthGuard and RolesGuard
- [ ] **2.6** Implement password hashing with bcrypt
- [ ] **2.7** Create admin user CRUD operations
- [ ] **2.8** Add Swagger authentication decorators
- [ ] **2.9** Write unit tests for AuthService and UsersService
- [ ] **2.10** Write E2E tests for authentication flow
- [ ] **2.11** Code review and merge to `develop`
- [ ] **2.12** Merge `develop` to `main` (Base Infrastructure Complete)

---

### 🎯 Phase 2: CMS Module (Sprint 3)

#### Sprint 3: CMS - Card, SystemConfig, Newsfeed
- [ ] **3.1** Create Card entity with Prisma schema (translations JSONB)
- [ ] **3.2** Implement CardModule with full CRUD operations
- [ ] **3.3** Create SystemConfig entity with Prisma schema
- [ ] **3.4** Implement SystemConfigModule with type-safe getters
- [ ] **3.5** Create Newsfeed entity with Prisma schema
- [ ] **3.6** Implement NewsfeedModule with pagination and filtering
- [ ] **3.7** Implement Redis caching strategy for public endpoints
- [ ] **3.8** Implement cache invalidation on admin updates
- [ ] **3.9** Integrate S3 presigned URLs for image uploads
- [ ] **3.10** Add comprehensive Swagger documentation for CMS APIs
- [ ] **3.11** Write unit tests for all CMS services
- [ ] **3.12** Write integration tests for cache invalidation
- [ ] **3.13** Code review and merge to `develop`

---

### 🎯 Phase 3: CRM + Product Modules (Sprints 4-6)

#### Sprint 4: CRM - Customer Inquiry & State Machine
- [ ] **4.1** Create CustomerInquiry entity with Prisma schema
- [ ] **4.2** Create InquiryNote entity with Prisma schema
- [ ] **4.3** Implement InquiryModule with CRUD operations
- [ ] **4.4** Implement Finite State Machine for inquiry status
- [ ] **4.5** Create public inquiry submission endpoint with rate limiting
- [ ] **4.6** Create admin endpoints (list, detail, add note, change status)
- [ ] **4.7** Implement email notification service (Nodemailer/SES)
- [ ] **4.8** Set up BullMQ job queue for async email sending
- [ ] **4.9** Implement admin notification on new inquiry
- [ ] **4.10** Add Swagger documentation for CRM APIs
- [ ] **4.11** Write unit tests for InquiryStateMachine
- [ ] **4.12** Write unit tests for InquiryService
- [ ] **4.13** Write integration test for email queue
- [ ] **4.14** Code review and merge to `develop`

#### Sprint 5: Product Module - Catalog & Redis Tracking
- [ ] **5.1** Create Category entity with tree structure (Prisma schema)
- [ ] **5.2** Create Product entity with Prisma schema
- [ ] **5.3** Implement ProductModule with full CRUD operations
- [ ] **5.4** Implement CategoryModule with tree operations
- [ ] **5.5** Implement product search and filtering
- [ ] **5.6** Implement Redis view tracking (INCR pattern)
- [ ] **5.7** Create ProductViewService (increment, get stats)
- [ ] **5.8** Implement public product endpoints with Redis caching
- [ ] **5.9** Implement admin product endpoints with cache invalidation
- [ ] **5.10** Add support for multiple product images (S3)
- [ ] **5.11** Add Swagger documentation for Product APIs
- [ ] **5.12** Write unit tests for ProductService and CategoryService
- [ ] **5.13** Write integration test for Redis view tracking
- [ ] **5.14** Code review and merge to `develop`

#### Sprint 6: Product Module - CronJobs & Analytics
- [ ] **6.1** Create ProductViewLog entity with Prisma schema
- [ ] **6.2** Implement daily flush CronJob (Redis → PostgreSQL)
- [ ] **6.3** Implement weekly aggregation CronJob
- [ ] **6.4** Implement auto-archival CronJob (products with no views)
- [ ] **6.5** Create analytics service (top products, trends)
- [ ] **6.6** Implement admin analytics endpoints
- [ ] **6.7** Add CronJob error handling and retry logic
- [ ] **6.8** Set up CronJob monitoring (logs, alerts)
- [ ] **6.9** Write integration tests for CronJobs with mocked time
- [ ] **6.10** Add Swagger documentation for Analytics APIs
- [ ] **6.11** Code review and merge to `develop`
- [ ] **6.12** Merge `develop` to `main` (All modules complete)

---

### 🎯 Cross-Cutting Concerns

#### Shared Components
- [ ] Create `packages/shared/types/` for shared TypeScript types
- [ ] Create `packages/shared/dto/` for shared DTOs (pagination, response, translations)
- [ ] Create `packages/shared/utils/` for validators and helpers
- [ ] Document module interaction rules
- [ ] Set up integration tests for cross-module dependencies

#### Database & Migrations
- [ ] Set up Prisma migration workflow
- [ ] Create migration naming convention template
- [ ] Document rollback procedures for each migration
- [ ] Test all migrations in staging environment
- [ ] Create database backup strategy

#### Quality & Testing
- [ ] Set up architectural linting (madge, depcruise)
- [ ] Configure ESLint and Prettier
- [ ] Set up Jest for unit testing
- [ ] Set up E2E testing framework
- [ ] Achieve ≥80% code coverage across all modules
- [ ] Create code review checklist template

#### CI/CD & Deployment
- [ ] Create GitHub Actions workflow (`.github/workflows/ci.yml`)
- [ ] Set up automated testing in CI
- [ ] Configure deployment to VPS
- [ ] Set up staging environment
- [ ] Create deployment checklist
- [ ] Document rollback procedures

#### Monitoring & Observability
- [ ] Implement metrics tracking service
- [ ] Set up Winston logging standards
- [ ] Create health check endpoint
- [ ] Set up error tracking (optional: Sentry)
- [ ] Create monitoring dashboard (optional)

---

### 🎯 Final Acceptance Criteria

#### Functional Requirements
- [ ] All CRUD operations working correctly for all entities
- [ ] JWT authentication and RBAC fully functional
- [ ] Redis caching working with proper invalidation
- [ ] Email notifications sending via BullMQ
- [ ] CronJobs running on schedule
- [ ] Multi-language support (vi/en) functional
- [ ] File uploads working via S3 presigned URLs

#### Non-Functional Requirements
- [ ] API response time < 200ms (90th percentile)
- [ ] Cache hit rate > 80% for public endpoints
- [ ] Zero N+1 query problems
- [ ] Code coverage ≥ 80% across all modules
- [ ] Zero circular dependencies
- [ ] All endpoints documented in Swagger

#### Production Readiness
- [ ] All tests passing in CI/CD pipeline
- [ ] Database migrations tested in staging
- [ ] Environment variables configured
- [ ] SSL certificates valid
- [ ] Health check endpoint returning OK
- [ ] Monitoring and alerting configured
- [ ] Rollback plan documented and tested

---

**End of Master Execution Plan**
