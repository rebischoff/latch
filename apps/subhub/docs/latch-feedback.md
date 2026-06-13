# Latch feedback — discovered while building SubHub

> Side-by-side improvements to `@latch/*`. When an item ships upstream, move it to **Resolved**.

## Open

| ID | Gap | SubHub workaround | Target package / doc |
|----|-----|-------------------|----------------------|
| L1 | Multi-table codegen glue skipped (`MULTI_TABLE_GLUE_SKIPPED`) | Hand `repository.ts` + descriptor per Surface | `@latch/codegen` |
| L2 | No collection Field codegen stub | Manual array projection + `replace*` SQL | `@latch/codegen` + DAL docs |
| L3 | `<SurfaceForm>` not implemented | App-local Ant Design + RHF wrappers | `@latch/react` or new `@latch/ui-antd` |
| L4 | No `nav:` metadata on Surface YAML | `lib/nav.ts` map `surfaceId → { label, href, group }` | `@latch/codegen` / contracts |
| L5 | No documented line-item snapshot recipe | Custom `copyEstimateToJob` in app DAL | `@latch/app-kit` docs |
| L6 | List subtype filtering (`customer_list`) | DAL list filter by `party_role` + surface id convention | `@latch/dal` docs |
| L7 | File / blob Field type | `cut_sheet_url` string column first | deferred |

## Resolved

_None yet._

## How to use

1. Hit friction while implementing a task.
2. Add a row (or extend an existing one) with concrete file paths.
3. If the fix belongs in Latch, open a platform task or PR separately — SubHub keeps the workaround until merged.
