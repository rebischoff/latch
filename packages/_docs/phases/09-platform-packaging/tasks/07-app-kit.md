# 07 — `@latch/app-kit`

> **Status:** Complete (2026-06-11). Next: [08-adapter-drizzle.md](./08-adapter-drizzle.md).

## Goal

Bootstrap orchestration kit (session 4 hybrid C; slice 9.6). Ties the adapters together so apps wire a thin `lib/latch.ts` registry only. REST factory is the required platform contract (4.11); Server Actions are optional sugar.

## Prerequisites

- Tasks 04 (`DatabaseConnections`) and 06 (`getPrincipal`) complete.

## Files

| File | Action |
|------|--------|
| `packages/app-kit/` (new) | `@latch/app-kit`; `resolveContext` (`getPrincipal` → manifest → `PermissionContext`), per-request manifest cache, `ensureAuditWriter` (wires `@latch/adapter-pg-audit`), `DatabaseConnections` injection (from `@latch/adapter-neon`), REST route factory, optional Server Action helpers |
| `packages/codegen/template/lib/latch.ts` | Reduce to thin registry + adapter injection |
| `packages/codegen/template/lib/audit-bootstrap.ts` (if present) | Delete; replaced by `ensureAuditWriter` |
| tests | `resolveContext` shape; REST read path for one fixture surface |

## Notes

- **No Neon imports** in app-kit — connections are injected via the `DatabaseConnections` port.
- Single package (no `@latch/next-kit` split) for v1.

## Verify (stop gate)

- [x] `@latch/app-kit` builds; exports `resolveContext`, `ensureAuditWriter`, REST factory.
- [x] Template `lib/latch.ts` is a thin registry; bespoke bootstrap glue deleted.
- [x] REST read works for one fixture surface (test).
- [x] No Neon imports in app-kit.
- [x] `npm run test` / `build` green; [`../STATUS.md`](../STATUS.md) → `08-adapter-drizzle.md`.

## Out of scope

- Drizzle store helper (task 08); kernel merge (task 09).
