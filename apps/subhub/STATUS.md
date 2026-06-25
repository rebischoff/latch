# STATUS — SubHub

> App-local quarterback. Platform pointer: [`../../STATUS.md`](../../STATUS.md).
> Updated: 2026-06-24.

- **Package:** `@latch/subhub` · **Port:** 3003
- **Docs:** [`docs/README.md`](./docs/README.md) · **Tasks:** [`docs/tasks/01-task-index.md`](./docs/tasks/01-task-index.md)
- **State:** Task **25** manufacturer detail **active** (step 10 stop gate). Task **24** wave **3a** parts **complete**. **After 25:** wave **3b** `item_*`.

## Right now — do this next

**Task 25 step 10 — Stop gate** — [`25-manufacturer-detail.md`](./docs/tasks/25-manufacturer-detail.md#step-10--stop-gate): verify exit criteria, `codegen:check`, mark step 10 complete.

## Blockers

None.

## Active slice

| Slice | Focus | State |
|-------|--------|-------|
| **01 — Party lenses** | Task 25 manufacturer detail | **active** — [`25-manufacturer-detail.md`](./docs/tasks/25-manufacturer-detail.md) |
| **03 — Catalog** | Wave 3b items | **queued** — after task 25; [`item.md`](./docs/surface-specs/item.md) (#15) |
| **04 — Estimates** | Wave 4a flat quote UI | **complete** ([task 22](./docs/tasks/22-estimate-wave-4a.md)); line UI **interim** until 4d′ |
| **05 — Jobs** | Wave 5a shell | **complete** ([task 23](./docs/tasks/23-job-wave-5a.md)) |
| [02 — Sites](./docs/tasks/01-task-index.md#task-20--ui-discovery) | Sites CRM slice | complete |
| **Surface specs** | Implement-tier docs | **16/27** — `manufacturer.md` ✅ spec (#6); implementation in task 25 |
| **UI discovery** | Task 20 | complete (2026-06-23) |

## Recently completed

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

- [Task 25 — manufacturer detail](./docs/tasks/25-manufacturer-detail.md) · [LinkedSelectInput step 11](./docs/tasks/25-manufacturer-detail.md#step-11--linked-picker-control-linkedselectinput) · [Picker return context](./docs/decisions/general.md#decision-picker-return-context--url-protocol-2026-06-24) · [Manufacturer spec](./docs/surface-specs/manufacturer.md)
- [Task 24 — part wave 3a](./docs/tasks/24-part-wave-3a.md) · [Part spec](./docs/surface-specs/part.md) · [Item spec](./docs/surface-specs/item.md) (next after 25)
- [Schema DBML](./docs/schema/current.dbml) · [Decisions](./docs/decisions/README.md)
