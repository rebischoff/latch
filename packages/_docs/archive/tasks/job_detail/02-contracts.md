# 02 — `@latch/contracts`

## Goal

Client-safe types and helpers: `Principal`, `Manifest`, `PermissionContext`, `narrowSchema`, shared errors.

## Prerequisites

[00-decisions.md](./00-decisions.md) complete.

## Files

| File | Action |
|------|--------|
| `packages/contracts/package.json` | Add `zod` dependency |
| `packages/contracts/src/types.ts` | New |
| `packages/contracts/src/narrow.ts` | New — `narrowSchema`, `fieldAllows`, readable/writable field helpers |
| `packages/contracts/src/errors.ts` | New — `ForbiddenError`, `NotFoundError`, `ValidationError` |
| `packages/contracts/src/index.ts` | Re-export public API |
| [`../../../STATUS.md`](../../../../../STATUS.md) | Next → `03-policy.md` |

## Steps

1. Read [`../../architecture/permissions-and-ui-sync.md`](../../../reference/permissions-and-ui-sync.md) manifest shape.
2. Define `FieldAction`, `Manifest`, `PermissionContext`, `PolicyScope`, `SurfacePolicies` types.
3. Implement `narrowSchema(baseZodObject, manifest, 'read' | 'write')` — writable path returns `.strict()`.
4. Export error classes with HTTP status hints (403, 404, 400).
5. Remove stub `PACKAGE_NAME`-only export from `index.ts`.
6. Ensure package imports **no** other `@latch/*` (ESLint boundary).

## Verify (stop gate)

- [x] `packages/contracts` builds under root `tsc` / workspace references
- [x] `narrowSchema` unit test or smoke: writable rejects unknown keys
- [x] ESLint: no `@latch/*` imports in `packages/contracts`
- [x] `STATUS.md` → **03-policy.md**

## Out of scope

`PolicyService`, DAL, DB.

## References

- [`.cursor/rules/10-invariants.mdc`](../../../../../.cursor/rules/10-invariants.mdc) — manifest + strict writes
