Role: You are an Expert NestJS Backend Developer.
Task: Implement the CRM Module for handling customer inquiries and consultations.
Tech Stack: NestJS, TypeScript, PostgreSQL.

System Requirements:
1. Database Schema Design:
Feature: Customer Connect Management
- Entity `CustomerInquiry`: 
  - id, customer_name, contact_info (phone/email), raw_message (text - free form input from customer).
  - status (Enum: PENDING, IN_PROGRESS, CONSULTED, REJECTED - default PENDING).
  - assigned_staff_id (uuid, nullable).
- Entity `InquiryNote`:
  - id, inquiry_id (Foreign Key to CustomerInquiry), staff_id, note_content (text).
  - Relationship: One `CustomerInquiry` has Many `InquiryNote`.

2. API Endpoints Needed:
- Public API: `POST /public/inquiries` - For customers to submit contact forms. 
  - Requirement: Apply strict Rate Limiting (e.g., max 3 requests per IP per 10 minutes) to prevent spam.
- Admin APIs:
  - `GET /admin/inquiries` - List all inquiries with filtering (by status, date range) and pagination.
  - `PATCH /admin/inquiries/:id/status` - Update consultation status.
  - `POST /admin/inquiries/:id/notes` - Add a consultation note after talking to the customer.
  - `GET /admin/inquiries/:id/notes` - Retrieve the history of notes for a specific inquiry.

Output: Provide the Entities, DTOs, Controllers, and Services. Focus on input validation using class-validator for the public POST endpoint to ensure data integrity.