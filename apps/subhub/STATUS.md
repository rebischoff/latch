# STATUS — SubHub

> App-local quarterback. Platform pointer: [`../../STATUS.md`](../../STATUS.md).
> Updated: 2026-06-25.

- **Package:** `@latch/subhub` · **Port:** 3003
- **Docs:** [`docs/README.md`](./docs/README.md) · **Tasks:** [`docs/tasks/01-task-index.md`](./docs/tasks/01-task-index.md)
- **State:** Task **28** employee detail **complete**. Task **27** create-route retrofit **complete**. Task **26** IAM role CRUD **complete**. Task **25** manufacturer detail — stop gate pending.

## Right now — do this next

**Task 25 step 10** — manufacturer stop gate ([`25-manufacturer-detail.md`](./docs/tasks/25-manufacturer-detail.md#step-10--stop-gate)).

## Blockers

None.

## Active slice

| Slice | Focus | State |
|-------|--------|-------|
| **01 — Party lenses** | Task 28 employee detail | **complete** ([task 28](./docs/tasks/28-employee-detail.md)) |
| **00 — IAM** | Task 26 role CRUD | **complete** ([task 26](./docs/tasks/26-iam-role-crud.md)) |
| **03 — Catalog** | Wave 3b items | **queued** — after task 25; [`item.md`](./docs/surface-specs/item.md) (#15) |
| **04 — Estimates** | Wave 4a flat quote UI | **complete** ([task 22](./docs/tasks/22-estimate-wave-4a.md)); line UI **interim** until 4d′ |
| **05 — Jobs** | Wave 5a shell | **complete** ([task 23](./docs/tasks/23-job-wave-5a.md)) |
| [02 — Sites](./docs/tasks/01-task-index.md#task-20--ui-discovery) | Sites CRM slice | complete |
| **Surface specs** | Implement-tier docs | **16/27** — `employee.md` ✅ shipped in task 28 |
| **UI discovery** | Task 20 | complete (2026-06-23) |

## Recently completed

- **Task 28 — Employee detail (stop gate)** — provision retrofit verified: email PATCH → `latch_users.login_email` sync; no **New** on `/users` list; `codegen:check` passed (2026-06-25).
- **Task 28 step 12 — Forced password change gate** — `/change-password-required` page + form; `POST /api/account/change-password-required`; `requireAuth` redirects when flag set; login redirects after success (2026-06-25).
- **Task 28 step 11 — Policy synthesis + `must_change_password`** — `synthesizeDataMasterBinding` unions custom `surfaceActions`; migration `026`; flag on admin-set password; setup master `false`; retired `POST …/add-as-db-user` (2026-06-25).
- **Task 28 step 10 — `/users/new` + user create API** — `user_list` `create`; `POST /api/iam/users`; `UserCreateForm`; dual auth (`user_list` create + `add_as_db_user`); `provisionLinkedDbUser` DAL (2026-06-25).
- **Task 28 step 9 — Provision UI retrofit** — **Add User** under employee title → `/users/new?linkPartyId&returnTo`; dirty-navigate confirm; login email checkbox when linked or `emails` writable; removed toolbar modal + `useEmployeeAddAsDbUser` (2026-06-25).
- **Task 28 steps 1–8 — Employee detail (interim)** — CRUD, `is_login_email`, shared identity DAL, interim modal provision (2026-06-25). **Steps 10–13** provision retrofit documented — [decision](./docs/decisions/party.md#decision-provision-app-user-from-person-surface-2026-06-25).
- **Task 28 planning (amend)** — locked provision UX: **Add User** → `/users/new`, dual auth gate, optional email/password, `must_change_password` (2026-06-25).
- **Task 27 — Create route retrofit** — parts, manufacturers, sites, jobs, estimates on `/new` + server-assigned id; list POST via `createListFromRegistry`; picker return to `/manufacturers/new` (2026-06-25).
- **Task 28 planning** — employee wave 0 decisions locked in [`party.md`](./docs/decisions/party.md#decision-employee-wave-0--implementation-2026-06-25); task file [`28-employee-detail.md`](./docs/tasks/28-employee-detail.md) (2026-06-25).
- **Task 26 — IAM role CRUD** — `/roles/new` + POST create; app role grant edit/delete; system `display_name` save; delete `in_use` blocker; P8 self-grant guard; `codegen:check` + DAL smoke (`scripts/iam-role-crud-smoke.mjs`) (2026-06-25).
- **Task 25 step 11** — `LinkedSelectInput` + `useConfirmDirtyNavigate`: compact select + open icon + `… Add {entity}` sentinel option; `PartDetailForm` manufacturer picker; `PartVendorPricingFields` vendor cell open icon (2026-06-24).
- **Task 25 step 11 (spec)** — `LinkedSelectInput` UX locked: `… Add {entity}` dropdown option + open icon; dirty-navigate confirm (v1); vendor grid open icon; decisions in [`general.md`](./docs/decisions/general.md); task step + [`part.md`](./docs/surface-specs/part.md) §I updated — implementation pending (2026-06-24).
- **Task 25 step 9** — part form picker integration: `resolvePartLinkAccess` gains `canCreateManufacturer` (`manufacturer_detail` write); `PartDetailForm` **Add new manufacturer** link via `buildPickerCreateUrl`; `useApplyPickerReturn` applies `selectedId` to `profile.manufacturer_party_id` and invalidates manufacturer picker (2026-06-24).
- **Task 25 step 8** — `PartyDetailForm` + manufacturer list UI: shared `PartyDetailForm` (`manufacturer_detail` branch — kind-specific profile, phones/emails, create Cancel / edit Revert+Delete); `PartyRoleFields` (Also chips, Add as…, Remove manufacturer tag); `ManufacturerList` debounced `q` search; role-action API helpers + `useManufacturerRoleActions` (2026-06-24).
- **Task 25 step 7** — nav + routes: `routes.manufacturers` confirmed; Contacts group `manufacturer_list` in `SURFACE_NAV_CATALOG`; `manufacturers/(master-detail)/` layout + pages (`create=1` + picker return params on detail); `ManufacturerList` list pane; longest-prefix nav highlight for `/manufacturers/[id]` (2026-06-24).
- **Task 25 step 6** — manufacturer surface plumbing: `manufacturer_detail` in `SURFACE_API` (`/api/manufacturers`, `listSurfaceId: manufacturer_list`); detail loader + `load-surface-detail` + generic `prefetchSurfaceDetail` / `prefetchSurfaceCreate` + `surfaceDetailKey` already wired (2026-06-24).
- **Task 25 step 5** — manufacturer API routes: `GET/PATCH/POST/DELETE /api/manufacturers/[id]`; `POST …/add-role` and `…/remove-role` sub-routes; `manufacturer_detail` in surface-loader-registry + `load-surface-detail` (2026-06-24).
- **Task 25 step 4** — manufacturer DAL write path: `insertManufacturerParty` / `updateManufacturerParty` (kind-specific profile + DAL-maintained `display_name`, org `parent_party_id` null); `replacePartyPhones`/`Emails` on patch; `addPartyRole` / `removePartyRole` with `manufacturer_part` blocker on tag removal; `extendManufacturerDetailDal` (`create`, `addRole`, `removeRole`, kind-immutable patch guard) + audit (2026-06-24).
- **Task 25 step 3** — manufacturer DAL read path: `loadManufacturerDetail` (kind-specific `party_person` / `party_organization` profile), `loadManufacturerDetailRelated` (phones, emails, `also_roles` for multi-tag chips); `createManufacturerDetailStore` with `party_role.manufacturer` lens guard (404 when tag missing); `manufacturerDetail` wired on `ContactsDal`; manifest projection tests (2026-06-24).
- **Task 24 step 9** — vendor pricing grid: `PartVendorPricingFields` (`FieldArrayTable` — vendor picker, PN, description, unit price, exclusive Preferred); `useVendorPicker` + prefetch; UOM conversion hint when `purchase_unit` ≠ `unit`; cross-nav to `/manufacturers/[id]` and `/vendors/[id]` when manifest grants; whole-part Save PATCHes `profile` + `vendor_pricing` (2026-06-24).
- **Task 24 step 8** — part UI shell: `PartList` (MPN / description / manufacturer columns, debounced `q` search, New → create); `PartDetailForm` profile (manufacturer picker, MPN, description, UOM fields); `SurfaceFormRoot` + Save/Revert/Delete toolbar; `useManufacturerPicker` + prefetch on detail page (2026-06-24).
- **Task 24 step 7** — nav + routes: `routes.parts.list` / `detail(id)`; Catalog group `part_list` in `SURFACE_NAV_CATALOG`; `parts/(master-detail)/` layout + pages; `PartList` list pane (MPN column); longest-prefix nav highlight for `/parts/[id]` (2026-06-24).
- **Task 24 step 6** — part API routes: `GET/POST /api/parts` (list supports `q` search), `GET/PATCH/POST/DELETE /api/parts/[id]`; `SURFACE_API` + surface-loader-registry wiring for `part_list` / `part_detail` (2026-06-24).
- **Task 24 step 5** — part DAL write path: `create` (profile required + optional `vendor_pricing`), `patch` profile + replace-array pricing, `delete` with `loadPartDeleteBlockers`; manufacturer/vendor role validation; MPN 409 + vendor PN duplicate checks; `is_preferred` exclusivity (2026-06-24).
- **Task 24 step 4** — part DAL read path: `lib/parts/` with `list` (`q` search on `mpn`/`description`, sort manufacturer + `mpn`) and `get` (`profile` + `vendor_pricing` manifest projection) (2026-06-24).
- **Task 24 step 3** — manufacturer delete blocker: `loadManufacturerDeleteBlockers` checks `manufacturer_part.manufacturer_party_id`; `InUseError` payload includes MPN `samples`; `deleteManufacturerParty` wired on manufacturer list store (2026-06-24).
- **Task 23 — job wave 5a** — stop gate: `023` migration + DBML `job_party.sort_order`; `job_list` / `job_detail` YAML + `codegen:check`; DAL list/get/create/patch (profile + stakeholders, internal `line_items`); API + surface-api; `/jobs` master-detail with tabbed shell (Overview live, Scope/Field/Billing stubbed); Operations nav (2026-06-24).

## Pointers

- [Task 28 — employee detail](./docs/tasks/28-employee-detail.md) · [Employee spec](./docs/surface-specs/employee.md) · [Party identity decision](./docs/decisions/party.md#decision-employee-wave-0--implementation-2026-06-25)
- [Task 27 — create route retrofit](./docs/tasks/27-create-route-retrofit.md) · [Task 26 — IAM role CRUD](./docs/tasks/26-iam-role-crud.md)
- [Task 25 — manufacturer detail](./docs/tasks/25-manufacturer-detail.md) · [Manufacturer spec](./docs/surface-specs/manufacturer.md)
- [Task 24 — part wave 3a](./docs/tasks/24-part-wave-3a.md) · [Item spec](./docs/surface-specs/item.md) (after 25)
- [Schema DBML](./docs/schema/current.dbml) · [Decisions](./docs/decisions/README.md)
