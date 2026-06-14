# Latch feedback — discovered while building SubHub

> Side-by-side improvements to `@latch/*`. When an item ships upstream, move it to **Resolved**.

## Open

| ID | Gap | SubHub workaround | Target package / doc |
|----|-----|-------------------|----------------------|
| L1 | Multi-table codegen glue skipped (`MULTI_TABLE_GLUE_SKIPPED`) | Hand `repository.ts` + descriptor per Surface — e.g. `modules/employee/generated/employee_detail.glue.generated.ts`, `employee_list.glue.generated.ts`; `contact_detail` anchor glue omits `phones`/`emails` projection | `@latch/codegen` |
| L2 | No collection Field codegen stub | `contact_detail.phones` / `emails` emit placeholder `z.array(z.object({ user_id }))` — **workaround shipped** in `lib/contacts/descriptors.ts` + `repository.ts` (task **14**) | `@latch/codegen` + DAL docs |
| L3 | `<SurfaceForm>` not implemented | App-local Ant Design + RHF wrappers | `@latch/react` or new `@latch/ui-antd` |
| L4 | No `nav:` metadata on Surface YAML | `lib/nav.ts` — static public/session items + `surfaceId → { label, href, group }` catalog; filtered in `nav-server.ts` | `@latch/codegen` / contracts |
| L5 | No documented line-item snapshot recipe | Custom `copyEstimateToJob` in app DAL | `@latch/app-kit` docs |
| L6 | List subtype filtering (`customer_list`) | DAL list filter by `party_role` + surface id convention | `@latch/dal` docs |
| L7 | File / blob Field type | `cut_sheet_url` string column first | deferred |

## Resolved

_None yet._

## How to use

1. Hit friction while implementing a task.
2. Add a row (or extend an existing one) with concrete file paths.
3. If the fix belongs in Latch, open a platform task or PR separately — SubHub keeps the workaround until merged.
