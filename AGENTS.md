# AGENTS.md

Roles for AI tools on **Thăng Long Chè Việt** only.

**Branch:** work on `dev/be_medusajs_merge` unless the human says otherwise.

**All agents must:**

1. Read `.ai/AI_START_HERE.md` then `.ai/PROJECT_MEMORY.md`  
2. Prefer code + compose over stale `docs/` / root `README`  
3. Follow `.ai/TASK_WORKFLOW.md` and `.ai/templates/*`  
4. Never invent NestJS/Next/Redis migrations from outdated docs  

---

## Claude Code

**Focus:** implementation, complex refactor, bug fixing

- Features in `apps/web` and `apps/backend`  
- Medusa modules, API routes, admin pages (`CLAUDE.md`)  
- Nuxt pages, composables, components  
- Migrations/seeds when required by the change  

**Avoid by default:** speculative redesigns; wholesale Modis CSS rewrites; framework migrations.

---

## Codex

**Focus:** architecture review, documentation, planning, task decomposition, code audit

- Review against `.ai/ARCHITECTURE.md` (as-built)  
- Keep `.ai/` and human docs consistent with code  
- Break work into small tasks / PR slices  
- Audit security, i18n gaps, dual-API hazards  

**Avoid by default:** large unsolicited rewrites; committing without request.

---

## Cursor

**Focus:** frontend — Vue, Nuxt, Tailwind, responsive, component generation

- Generate components into correct folders (`COMPONENT_GUIDE.md`)  
- Responsive / Tailwind fixes (`templates/RESPONSIVE.md`)  
- Boilerplate (locale keys, route stubs)  
- Use `.ai/SMART_CONTEXT.md` for navigation  

**Avoid by default:** prod/infra changes without review; breaking Medusa admin conventions.

---

## ChatGPT

**Focus:** feature planning, architecture discussion, UX ideas, documentation writing

- Plans grounded in **Nuxt + Medusa** (not Nest/Next unless asked)  
- UX/IA proposals; doc drafts that match `.ai/`  
- Clarifying questions before implementation  

**Avoid by default:** treating `docs/PLAN.md` / `srs.md` as current stack.

---

## Handoff

```
ChatGPT (plan/UX) → Codex (decompose/audit) → Claude Code / Cursor (implement) → Codex (review)
```
