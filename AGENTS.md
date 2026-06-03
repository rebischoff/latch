# AI agent guidance

> **Start every session by reading [`STATUS.md`](./STATUS.md).** It is the single source of truth for "what's next."

Detailed rules live in [`.cursor/rules/`](./.cursor/rules/). Highlights:

- [`00-orientation.mdc`](./.cursor/rules/00-orientation.mdc) — what to read first
- [`10-invariants.mdc`](./.cursor/rules/10-invariants.mdc) — architectural rules that must never be violated
- [`20-naming.mdc`](./.cursor/rules/20-naming.mdc) — project name + domain terms
- [`30-nextjs.mdc`](./.cursor/rules/30-nextjs.mdc) — Next.js 16 traps
- [`40-docs.mdc`](./.cursor/rules/40-docs.mdc) — documentation style
- [`45-phase-tasks.mdc`](./.cursor/rules/45-phase-tasks.mdc) — mark task verify gates complete; update phase STATUS
- [`50-typescript.mdc`](./.cursor/rules/50-typescript.mdc) — arrow functions, TS conventions

<!-- BEGIN:nextjs-agent-rules -->
## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Scope discipline

The project has an explicit v1 scope in [`docs/foundations/scope.md`](./docs/foundations/scope.md). **Refuse to implement features marked deferred** unless the user explicitly overrides; suggest a docs update instead.

## Naming

- Product name **Latch** — `@latch/*` packages, `latch_*` DB prefix ([`docs/foundations/naming.md`](./docs/foundations/naming.md)).
- "Surface" (not "Module") is the term for screen-shaped policy boundaries.

## Delete lifecycle (locked 2026-05-30)

**Hard delete only.** No `deleted_at`, no soft delete, no `soft_delete` audit action. Use `delete` in policy, DAL, and audit. Recovery = restore-from-audit (Phase 04). See [`docs/foundations/scope.md`](./docs/foundations/scope.md).
