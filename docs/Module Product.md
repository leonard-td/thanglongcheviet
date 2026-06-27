Role: You are an Expert NestJS Backend Developer.
Task: Implement the Product Module focusing on E-commerce catalog management and future scalability for high-write traffic.
Tech Stack: NestJS, TypeScript, PostgreSQL, Redis.

System Requirements:
1. Database Schema Design:
Feature: Product Management
- Entity `Product`:
  - id, name, sku (unique), description, base_price (decimal).
  - discount_rate (int, 0-100, default 0).
  - is_visible (boolean, default true - indicates if it appears on the sales page).
  - is_featured (boolean, default false - prominent product).
  - is_best_seller (boolean, default false - high purchase product).
  - view_count (bigint, default 0).
  - purchase_count (bigint, default 0).

2. API Endpoints Needed:
- Admin APIs:
  - Full CRUD for Product.
  - Toggle visibility, toggle `is_featured`, toggle `is_best_seller`.
  - Set `discount_rate`.
- Public APIs:
  - `GET /public/products` - List products with filters: search by name (use ILIKE or PostgreSQL pg_trgm), filter by `is_visible=true`, filter by `is_featured`, filter by `is_best_seller`. Must include pagination. Cache the first page of default results in Redis.
  - `GET /public/products/:id` - Get product details.

3. High Scale Feature Setup (Preparation for +20M automatic counting):
- Create an API `POST /public/products/:id/track-view`. 
  - Requirement: DO NOT update the PostgreSQL `view_count` directly. Instead, implement a Redis Service that uses `Redis INCR` on a key like `product:{id}:views`. 
  - Create a NestJS CronJob (Task Scheduling) that runs every 5 minutes to gather all view counts from Redis, perform batch bulk updates into the PostgreSQL `Product` table, and then clear those Redis keys.

Output: Provide Entities, DTOs, Services, Controllers, and the CronJob worker code. Ensure complex filtering in the GET API is handled efficiently.