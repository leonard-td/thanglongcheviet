Role: You are an Expert Tech Lead and Agile Scrum Master.
Task: Create a comprehensive and conflict-free Execution Plan to develop a Modular Monolith NestJS backend. You will orchestrate the execution of 3 specific Developer Prompts (CMS, CRM, and Product modules).

Input Context:
The system uses NestJS, PostgreSQL (TypeORM/Prisma), Redis, and AWS S3. It follows a Modular Monolith architecture.
- Prompt 1: Base Architecture & CMS Module (Card, SystemConfig, Newsfeed). @D:\01.WORKS\WWW\Thang_long_che_viet_project\docs\Base Architectur.md
- Prompt 2: CRM Module (Customer Inquiry, Inquiry Notes with State Machine). @D:\01.WORKS\WWW\Thang_long_che_viet_project\docs\Module CRM.md
- Prompt 3: Product Module (E-commerce Catalog, High-scale Redis tracking + CronJobs). @D:\01.WORKS\WWW\Thang_long_che_viet_project\docs\Module Product.md

System Requirements & Directives for the Plan:
1. Dependency Management: 
- The Base Setup (Database, Redis, Exception Filters, Swagger, Presigned URL Service) MUST be completed and merged to the `main` branch before any module-specific development begins.
- Outline clear Git branching strategies for the AI Agents to avoid merge conflicts.

2. Phased Execution (Sprints):
Divide the work into logical phases or Sprints. For each phase, clearly specify:
- Goal of the phase.
- Which Prompt (or part of a prompt) is being executed.
- Expected Output (Deliverables).
- Definition of Done (DoD) - e.g., Unit tests passed, Swagger updated, Postman collection generated.

3. Cross-Module Integration:
- Define how modules will share common types, DTOs, or utility functions without breaking the boundaries of the Modular Monolith.
- Detail the testing strategy for the integration between the Redis CronJob (Product Module) and the PostgreSQL Database.

4. Risk & Quality Control:
- Include a step for Code Review & Architectural Linting after each phase to ensure Dependency Injection is used correctly and no spaghetti code is introduced.
- Detail the database migration strategy (how the agents should handle schema changes).

Output format:
Provide a highly structured, step-by-step Master Plan in Markdown. Use tables for Sprint planning and bullet points for the Definition of Done and Git strategy. The plan must be ready to be handed over to a team of AI Developer Agents for immediate execution.