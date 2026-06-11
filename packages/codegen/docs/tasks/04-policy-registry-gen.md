# 04 — Surface policy *vocabulary* from metadata (roles move to runtime)

> **Status:** Complete (2026-06-06). Next: runtime role tasks in [`packages/policy/docs/tasks/`](../../../policy/docs/tasks/README.md) (DB tables, DB-backed provider, role-editor IAM Surface).

## Goal

Make codegen emit the per-Surface **policy vocabulary** — the closed set of Field ids and actions that *can* be granted — consumed by **(a)** `PolicyService` to shape the manifest (`fieldIds` for `ensureFieldKeys`, surface `kind`, available actions) and **(b)** the runtime **role editor** as its allowed-options menu. Codegen **no longer emits role→Field grants**; those become runtime rows in `latch_role_grants`, created/updated/deleted by app users.

This reverses the grant-generation half of **Decision H**: YAML is no longer the source of truth for *who gets what*. It remains (via the surface schema) the source of truth for *what exists*.

> **Invariant guard:** unchanged — codegen enforces nothing. It emits a catalog; `PolicyService` resolves against runtime grants + this catalog; the DAL enforces. The role editor validates writes against this catalog. See [invariant 1](../../../../.cursor/rules/10-invariants.mdc).

## Background

- The vocabulary lives in the generated surface schema: `WidgetListFieldIds` + `${surface}SurfacePolicyDef` in [`widget_list.schema.generated.ts`](../../../../apps/spike_codegen/modules/widget/generated/widget_list.schema.generated.ts). **No separate `*.policies.yaml` or `*.policies.generated.ts`.**
- The runtime registry entry needs `fieldIds` + `kind` + the available surface/field actions, but **no** baked `roles: {...}` map.
- "Mode overlay" = the per-screen (`list`/`detail`/`create`) restriction of a role's grants — **not** the schema/glue files. Since grants are now runtime, overlays follow to runtime data (fine-tune later).
- `*.policies.yaml` is **retired** (grant source and vocabulary source). Optional seed YAML for `latch_roles` / `latch_role_grants` may remain in apps but is not codegen input.

## Files

| File | Action |
|------|--------|
| `packages/codegen/src/generate.ts` | **Edit** — parse `kind` / `fieldActions` / `surfaceActions` / `modes` from `*.surface.yaml`; emit `${surface}SurfacePolicyDef` in `*.schema.generated.ts` |
| `packages/codegen/src/policies.ts` | **Delete** — separate policies pipeline removed |
| `packages/policy/src/registry.ts` | **Edit** — catalog-only `SurfacePolicyDefinition` (no `roles`) |
| `packages/policy/src/grant-provider.ts` | **Create** — `RoleGrantProvider` + `MemoryRoleGrantProvider` |
| `packages/policy/src/policy-service.ts` | **Edit** — `resolve` reads grants from provider |
| `apps/spike_codegen/modules/widget/widget_list.surface.yaml` | **Edit** — add `kind` + action vocabulary |
| `apps/spike_codegen/modules/widget/widget_list.policies.yaml` | **Delete** |
| `apps/spike_codegen/modules/widget/generated/widget_list.policies.generated.ts` | **Delete** — catalog now in `widget_list.schema.generated.ts` |
| `docs/reference/metadata-and-codegen.md` | **Edit** — vocabulary from surface YAML only |

## Steps

1. Define grant-free catalog shape on `SurfaceDef`: `kind`, Field ids (from fields), closed action vocabulary, optional mode list. **No per-role blocks. No separate policies file.**
2. Emit `${surface}SurfacePolicyDef` in `*.schema.generated.ts` — consumable by `definePolicyRegistry`.
3. Introduce the `RoleGrantProvider` seam in `@latch/policy`; memory provider for tests.
4. Regenerate spike output; confirm catalog in schema file, no policies artifacts.
5. Grant validation moves to **write time** in the role editor (against codegen catalog).

## Decisions / notes

- **Decision 1:** codegen/seed authors **only** `data_master` / `iam_master`; the `latch_roles` catalog otherwise starts empty and app users populate it.
- **Decision 2:** grant granularity = one row per role × surface × field × action (may be fine-tuned in a later discussion).
- **Decision 3:** the surface **schema/glue** generated files are the vocabulary layer.
- **Decision 4:** the "can't grant a Field the surface doesn't define" check moves from build-time `--check` (on YAML grants) to **write-time** validation in the role editor; `resolve`'s `ensureFieldKeys` remains defense-in-depth.
- **Decision 5 (2026-06-06):** retire `*.policies.yaml` → `*.policies.generated.ts` entirely; fold vocabulary into `*.surface.yaml` → `*.schema.generated.ts`.

## Verify (stop gate)

- [x] Generated schema output contains the Field/action **vocabulary** (`fieldIds`, `kind`, actions) and **no** role→Field grants
- [x] `PolicyService` consumes the catalog; role grants come from a runtime `RoleGrantProvider` seam, not the static registry
- [x] `--check` still fails if generated catalog drifts from surface YAML
- [x] Spike `widget_list` catalog lives in `widget_list.schema.generated.ts`; `*.policies.yaml` / `*.policies.generated.ts` removed
- [x] A memory `RoleGrantProvider` + two roles produce **different** manifests via `PolicyService.resolve`
- [x] `metadata-and-codegen.md` reflects surface-only vocabulary emit

## Reference

- `@latch/policy`: [`registry.ts`](../../../policy/src/registry.ts), [`policy-service.ts`](../../../policy/src/policy-service.ts), [`grant-provider.ts`](../../../policy/src/grant-provider.ts)
- [`docs/foundations/scope.md`](../../../docs/foundations/scope.md) — "app-defined roles are runtime data" (2026-06-06)
- [`docs/discussions/02-identity-and-permissions.md`](../../../docs/discussions/02-identity-and-permissions.md)
