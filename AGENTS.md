# AI agent guidance

> **Start every session by reading [`STATUS.md`](./STATUS.md).** It is the single source of truth for "what's next."

Detailed rules live in [`.cursor/rules/`](./.cursor/rules/). Highlights:

- [`00-orientation.mdc`](./.cursor/rules/00-orientation.mdc) — what to read first
- [`10-invariants.mdc`](./.cursor/rules/10-invariants.mdc) — architectural rules that must never be violated
- [`20-naming.mdc`](./.cursor/rules/20-naming.mdc) — project name + domain terms
- [`30-nextjs.mdc`](./.cursor/rules/30-nextjs.mdc) — Next.js 16 traps
- [`40-docs.mdc`](./.cursor/rules/40-docs.mdc) — documentation style

<!-- BEGIN:nextjs-agent-rules -->
## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Scope discipline

The project has an explicit v1 scope in [`docs/planning/scope.md`](./docs/planning/scope.md). **Refuse to implement features marked deferred** unless the user explicitly overrides; suggest a docs update instead.

## Naming

- Product name **Latch** — `@latch/*` packages, `latch_*` DB prefix ([`docs/planning/naming.md`](./docs/planning/naming.md)).
- "Surface" (not "Module") is the term for screen-shaped policy boundaries.
