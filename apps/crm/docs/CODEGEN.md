# CRM — Surface codegen (monorepo)

> **Platform tool:** `@latch/codegen` (`packages/codegen`). Root scripts: `npm run codegen`, `npm run codegen:check`.

## Layout

Surface metadata lives **per app**, not in `packages/`:

```
apps/<app>/modules/<domain>/
  *.surface.yaml
  *.policies.yaml   # when used
  generated/
    <surface_id>.schema.generated.ts
```

CRM today: [`../modules/`](../modules/) (e.g. `job/`, `customer/`).

## Current behavior (implementation)

`@latch/codegen` **hardcodes** `apps/crm/modules` as its scan root (`packages/codegen/src/generate.ts`). Root `npm run codegen` only emits files under CRM until the generator is generalized.

That is acceptable while CRM is the only app with Surface YAML. It is **not** a long-term shape: a second consumer (`apps/test1`) cannot use codegen until the tool discovers one or more app roots (e.g. all `apps/*/modules/`, or `LATCH_CODEGEN_APPS=crm,test1`).

## Target behavior (before test1 task 10)

| Requirement | Why |
|-------------|-----|
| No single hardcoded app path | test1 and future apps each own `modules/` |
| Same CLI at repo root | One `codegen:check` in CI for all committed `generated/` |
| Output next to source YAML | `generated/` stays under the app that owns the Surface |

**Planned:** generalize `@latch/codegen` when test1 adds its first `*.surface.yaml` (test1 task **10**). Until then, test1 documents only — see [`../../test1/modules/README.md`](../../test1/modules/README.md).

## Workflow (CRM today)

1. Edit or add `*.surface.yaml` under `apps/crm/modules/`.
2. Run `npm run codegen` from repo root.
3. Commit YAML + `generated/*.schema.generated.ts`; CI runs `npm run codegen:check`.

## Related

- [`PLAN.md`](./PLAN.md) — CRM proof harness includes codegen row
- [`../../../docs/reference/packages.md`](../../../docs/reference/packages.md) — package boundaries
- test1: [`../../test1/docs/decisions.md`](../../test1/docs/decisions.md) — phased codegen decision
