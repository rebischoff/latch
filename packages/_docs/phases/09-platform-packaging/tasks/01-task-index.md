# 01 — Task index (Phase 09 platform packaging)

> Orient the Phase 09 task chain. **Do not implement code in this file.** Each task below has its own Verify (stop gate). Work them in order unless a dependency note says otherwise.

## Status discipline

When a task's code is finished, in the **same turn**: set the task's `> **Status:** Complete (date). Next: …` line, flip every `- [ ]` in its Verify gate to `- [x]`, and update [`../STATUS.md`](../STATUS.md) (Right-now pointer + Recently-completed). See [`.cursor/rules/45-phase-tasks.mdc`](../../../../../.cursor/rules/45-phase-tasks.mdc).

## Chain

| Task | Deliverable | Gates / depends on |
|------|-------------|--------------------|
| [00 — clean slate](./00-clean-slate.md) | Remove all `apps/`; repoint tooling to template; preserve CRM fixtures for the proof | none (start here) |
| [02 — `@latch/adapter-pg-audit`](./02-adapter-pg-audit.md) | Package `createPostgresAuditWriter`; template imports it; delete copies | 00 |
| [03 — `@latch/pg-session`](./03-pg-session.md) | Extract `withPermissionDb`; `@latch/audit` re-exports | 02 |
| [04 — `@latch/adapter-neon`](./04-adapter-neon.md) | Dual-URL `DatabaseConnections` (standard pg); `.env.example` | 03; lock `DatabaseConnections` home |
| [05 — audit mode](./05-audit-mode.md) | `latch_app_config` + `011_pending_changes` migrations; DAL gate; `--audit-mode` | 02 |
| [06 — `@latch/adapter-better-auth`](./06-adapter-better-auth.md) | Better Auth → `getPrincipal` → `latch_users`; template wires it | 00 |
| [07 — `@latch/app-kit`](./07-app-kit.md) | `resolveContext`, manifest cache, `ensureAuditWriter`, REST + optional Actions | 04, 06 |
| [08 — `@latch/adapter-pg-store`](./08-adapter-drizzle.md) | Async `StoreAdapter` + raw-`pg` store + codegen store SQL (SQL-first; Drizzle retired 2026-06-11) | 07 |
| [09 — merge server kernel](./09-kernel-merge.md) *(optional)* | `@latch/policy+dal+audit+approval` → one package; parity | 08 |
| [10 — scaffold proof](./10-scaffold-proof.md) | `latch new` trades-CRM proof; phase DoD | 02–08 |
| [11 — AI authoring toolchain](./11-ai-toolchain.md) *(parallel)* | YAML JSON Schema, destructive-migration linter, `contact_list` proof | can run alongside 02–05 |

## Definition of done

Phase DoD lives in [`../README.md`](../README.md#definition-of-done). The end-to-end gate is task 10 (scaffold proof) plus the kernel-clean grep.
