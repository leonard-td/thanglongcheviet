Role: You are an Expert NestJS Backend Developer.
Task: Initialize the base architecture for a Modular Monolith NestJS project and implement the CMS Module.
Tech Stack: NestJS, TypeScript, PostgreSQL (TypeORM/Prisma), Redis, AWS S3 SDK.

System Requirements:
1. Base Setup:
- Configure Global Exception Filter, ValidationPipe, and Swagger UI.
- Set up Database connection (PostgreSQL) and Redis caching module.
- Set up a MediaService module that generates S3 Presigned URLs for file uploads (so the frontend uploads images directly to S3/Cloudflare R2). Do NOT handle multipart file uploads in the backend.

2. CMS Module Implementation:
Ensure all entities have created_at, updated_at, and deleted_at (Soft Delete).

Feature A: Card Management
- Entity `Card`: id, title (string), link (string), image_url (string).
- Create CRUD REST APIs for Admin to manage cards.

Feature B: Dynamic System Configuration (Contact, Address, Social Accounts)
- Entity `SystemConfig`: id, config_key (string, unique), config_value (JSONB).
- Create APIs to GET and PUT configs.
- Requirement: The GET endpoint must be cached in Redis with a long TTL. When PUT is called, explicitly invalidate the corresponding Redis cache key.

Feature C: Newsfeed Management
- Entity `News`: id, title, content, thumbnail_url, is_homepage_visible (boolean, default: false).
- Admin APIs: Full CRUD. Ability to toggle `is_homepage_visible`.
- Public API: `GET /public/news/homepage` to fetch only news where `is_homepage_visible` is true. This endpoint MUST be heavily cached via Redis.

Output: Provide the Entity definitions, DTOs (with class-validator), Services, and Controllers. Ensure clean code architecture and dependency injection.