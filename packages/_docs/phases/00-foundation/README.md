# Phase 00 — Foundation (`@latch/contracts`, `@latch/policy`, `@latch/codegen`)

> **Home packages:** `@latch/contracts`, `@latch/policy`, `@latch/codegen` (+ single-record `@latch/dal` kernel) · **Status:** mostly done · **Phase STATUS:** [`STATUS.md`](./STATUS.md)

## Goal

The smallest stack that supports **one Surface end-to-end**: server-resolved manifest types, a `PolicyService` that merges roles, codegen from Surface YAML, and a single-record DAL that narrows reads/writes from the manifest. This was delivered during the `job_detail` pilot (archived: [`../../archive/step-3-pilot-surface.md`](../../archive/step-3-pilot-surface.md)).

## Depends on

- Nothing. This is the base phase.

## In / out of scope

| In scope | Out of scope (this phase) |
|----------|---------------------------|
| Manifest / `Principal` / `PermissionContext` types (`@latch/contracts`) | List + bulk (Phase 01) |
| `PolicyService` with `union_grants` + `denyWins` | UI components (Phase 02) |
| Codegen CLI + `codegen --check` (T11) | Identity / roles in DB (Phase 03) |
| Single-record DAL read / write with Field narrowing + row scope | Hard delete / recovery (Phase 04) |
| `readableSchema` / `writableSchema` (`.strict()`) narrowing | Caching / RLS (Phase 06) |

## Sub-goals — what this phase proves

1. Manifest is the **server-only** source of truth; UI mirrors it.
2. All business data via DAL + `PermissionContext` (no raw DB outside `@latch/dal`).
3. Forbidden Fields **omitted** from DTOs.
4. Writable Zod **`.strict()`** rejects unknown keys (T1).
5. Row scope — owner/assignment filter in DAL.
6. `PolicyService` matrix tests (`union_grants` × `denyWins`).
7. `codegen --check` green (T11).

## Definition of done

- [x] `@latch/contracts`, `@latch/policy`, `@latch/codegen` skeletons + real code
- [x] Single-record DAL read/write/narrowing + contract tests
- [x] Policy matrix tests
- [x] Threat tests T1, T2, T3, T6, T11, T13 in CI
- [x] Proven via the archived `job_detail` pilot

## References

- [`../../reference/access-control.md`](../../../policy/docs/access-control.md) · [`../../reference/permissions-and-ui-sync.md`](../../reference/permissions-and-ui-sync.md)
- [`../../reference/metadata-and-codegen.md`](../../../codegen/docs/reference/metadata-and-codegen.md) · [`../../reference/packages.md`](../../reference/packages.md)
- Pilot history: [`../../archive/tasks/job_detail/`](../../../../docs/archive/tasks/job_detail)
