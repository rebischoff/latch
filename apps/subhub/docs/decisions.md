# SubHub — decisions

> Lock choices here before implementation tasks. Add a dated **Decision** block when something new is settled.

## Open

_None._

---

## Decided

### Decision: schema-first — finish DBML before migrations (2026-06-16)

**Choice:** Defer task **18** (site migration SQL) until [`schema/current.dbml`](./schema/current.dbml) covers **Slices 2–6** at column level and open FK forks are locked. Iterate DBML + decisions + architecture per [`schema/README.md`](./schema/README.md); **no new `migrations/*.sql`** until task **17** (schema design pass) exits.

**Rationale:** Shipped `016_party.sql` already diverges from the design target (`party_person`, `note`, `employee` → `party_person`). Sites and downstream slices share FK graphs (estimate → job → invoice, line snapshots, relation catalogs). Designing holistically avoids migration churn and second refactor passes. Implementation still lands in delivery slices (Surfaces/DAL/UI per slice); SQL batches follow the stabilized ERD.

**Locked in DBML (task 17):**

| Topic | Choice |
|-------|--------|
| Engagement stakeholders | `estimate_party` + `job_party` via **`job_party_relation`** catalog (not master `party_role` for GC/sub) |
| Quote / job anchor | `estimate.site_id`, `job.site_id` NOT NULL; **no** sole `customer_id` on `job` or `site` |
| Vendor pricing | `vendor_part_price` — one current row per vendor+part (no price history in v1) |
| Item kinds | `item.kind` CHECK: `product`, `labor`, `assembly` |

**Still deferred:** `attachment`, address verification, `party_user`, employee HR columns, Slice 7 report SQL.

### Decision: single `/login` page — no modal (2026-06-12)

**Choice:** One `/login` route with an inline form inside the root shell. Voluntary login (header/user menu) and auth gating both navigate to `/login?callbackUrl=…`. No separate login modal. `/login` lives under **`(public)`**, not `(private)`.

**Rationale:** Simpler than dual modal + page paths; shell chrome stays consistent. `callbackUrl` returns the user to the public page they came from or the private route they intended. Failed sign-in stays on `/login`. Manifest 403/404 on the destination is separate from authentication.

### Decision: no `proxy.ts` / `middleware.ts` for auth (2026-06-12)

**Choice:** SubHub does **not** use Next.js `proxy.ts` (formerly `middleware.ts`) for session gating or `callbackUrl` plumbing.

**Rationale:** Next.js 16 renamed middleware to proxy to clarify it is a **network boundary** (rewrites, fast redirects) — not an application auth firewall. Authoritative checks belong in layouts, pages, and the DAL. Injecting `x-pathname` via proxy to work around layout limitations couples auth to the wrong layer. See [routing-and-libraries.md](./routing-and-libraries.md#auth-gating).

### Decision: per-page `requireAuth(path)` for private routes (2026-06-12)

**Choice:** Each `(private)` page calls `requireAuth('/explicit/path')` at the top of the Server Component. The helper reads `readBetterAuthSession`; on failure, `redirect(loginHref(path))`. Voluntary login from `UserMenu` builds `callbackUrl` client-side via `usePathname()`.

**Rationale:** Server layouts cannot read the current URL (intentional Next.js design for partial rendering). SubHub already uses explicit routes — each page knows its href. Fits dynamic routes (`/contacts/[id]` → `` requireAuth(`/contacts/${id}`) ``). `(private)/layout.tsx` stays a passthrough; no `/login` exemption hack.

### Decision: SubHub is the primary Latch consumer app (2026-06-12)

**Choice:** Build SubHub as the real trades/AV integration app on the scaffolded template (`apps/subhub`), developing `@latch/*` in parallel when gaps appear.

**Rationale:** Platform packaging (Phase 09) is complete; a full domain app is the right proof and product driver.

### Decision: no approval / verification workflow (2026-06-12)

**Choice:** SubHub v1 excludes pending changes, accept/reject, and `requires_verification` Fields.

**Rationale:** Owner request; simplifies DAL and UI paths while the domain model is still evolving.

### Decision: party spine for contacts (2026-06-12)

**Choice:** One `party` table (`kind`: `person` \| `organization`) with `party_role` tags (`customer`, `vendor`, `manufacturer`, `employee`). Subset list Surfaces filter by role; one `contact_detail` Surface for CRUD *(detail/list nav shape [deferred](#decision-party-listdetail-surface-shape--deferred-2026-06-16) — may become unified party + role filters)*.

**Amended (2026-06-15):** Master role enum expanded and split from job-scoped relations — see [party_role master tags vs job-scoped relations](#decision-party_role-master-tags-vs-job-scoped-relations-2026-06-15).

**Amended (2026-06-16):** Kind-specific columns live in 1:1 extensions `party_person` / `party_organization` (not on `party`). `employee.party_id` FK targets `party_person` — staff are always persons; `party_role` tag `employee` for master list filtering. Interim staff login via `employee.latch_user_id` until [party identity slice](#decision-party-identity--party_user--user_class-deferred-2026-06-15) lands (`party_user`). See [`schema/current.dbml`](./schema/current.dbml).

**Rationale:** Avoids duplicate CRUD across Customer/Vendor/Manufacturer tables; matches “subset of contacts” language.

### Decision: explicit routes — no catch-all surface pages or APIs (2026-06-12)

**Choice:** **Do not** use dynamic catch-all routes such as `app/[surface]/page.tsx` or `api/surfaces/[surfaceId]/[id]/route.ts`. Each domain gets explicit App Router segments and API route files (`contacts/[id]`, `api/contacts/[id]`). Entity id segments (`[id]`) are fine.

**Rationale:** Forms, toolbars, and multi-table layouts differ per Surface; a generic page would accumulate exceptions. Shared **factories** (`createSurfaceRouteHandlers`, DAL descriptors) still deduplicate server logic — only the route **files** stay explicit. See [routing-and-libraries.md](./routing-and-libraries.md).

### Decision: master-detail via nested layout, not parallel routes (2026-06-12)

**Choice:** List + detail uses a **shared parent `layout.tsx`** (list in the layout, detail in child `page.tsx` / `[id]/page.tsx`). **Do not** use parallel route slots (`@list` / `@detail`) in v1.

**Rationale:** Parallel routes add slot wiring, soft-navigation edge cases, and duplicate data-fetch coordination for modest gain. Nested layouts keep the list mounted when switching ids, URLs stay shareable (`/contacts/abc`), and implementation matches prior CRM split-shell learning without `?id=` query strings. Revisit parallel routes only if independent `loading.tsx` / `error.tsx` per pane becomes a measured need.

### Decision: catalog tables — editable table page, not master-detail (2026-06-16)

**Choice:** Small **master/catalog** tables (`site_contact_relation`, and similar FK targets in later slices) get a dedicated **catalog table Surface** — one route, one screen, **not** `{entity}_list` + `{entity}_detail`.

| Pattern | Use when | Route shape | UI |
|---------|----------|-------------|-----|
| **Master-detail** | Business anchors with many rows and rich detail forms (`party`, `site`, `job`) | `/contacts`, `/contacts/[id]` | List sider + detail pane |
| **Catalog table** | Short admin-editable catalogs referenced by FK pickers | `/sites/contact-relations` (example) | Single page: editable `Table` (add / edit / delete rows) |

**Rules:**

- Surface id: `{table}_table` (e.g. `site_contact_relation_table`).
- **Always ship the catalog table page** when the catalog table is introduced — users must be able to edit rows without waiting for progressive setup or dev seeds. Setup wizards may **suggest** initial rows; the table page is the ongoing admin path.
- Nav: link in the same sidebar **group** as the consuming domain (e.g. Sites → “Contact relations”) when manifest grants read; omit when empty group rules apply.
- API: explicit routes (e.g. `api/sites/contact-relations/route.ts`, `…/[id]/route.ts`) — same factory pattern as other Surfaces, not catch-all.
- Permissions: manifest on the catalog Surface; child pickers on parent Surfaces only need `read` on catalog rows for dropdown labels.

**First instance:** `site_contact_relation_table` in Slice 2 (task **18** surfaces, task **19** DAL/API/UI) — fields `display_name`, `sort_order`.

**Rationale:** Master-detail splits a sparse catalog across list + detail panes for no gain. An editable table matches how admins think about lookup tables and guarantees an edit path when DDL starts empty or progressive setup is skipped.

**Choice:** Ant Design 6 + `@ant-design/nextjs-registry`, React Hook Form + `@hookform/resolvers` (Zod from codegen), TanStack Query v5. `@latch/react` for `<Can>` / `<FieldControl>` / `CapabilitiesProvider`.

**Rationale:** Owner request; alignment table from [UI sync discussion](../../../packages/_docs/discussions/06-ui-sync.md) still applies (omit / read-only / editable from manifest).

### Decision: child collections as logical Fields (2026-06-12)

**Choice:** Related rows (phones, emails, line items) are **logical Fields** on the parent detail Surface — projected as arrays in the DTO, patched via strict Zod array keys, edited with RHF `useFieldArray`. v1 patch semantics: **replace whole collection** on save for that Field.

**Rationale:** Fits Latch Field vocabulary; avoids a Surface per child row. Canonical pattern: [child-collections.md](./child-collections.md).

### Decision: line-item snapshots on estimate → job → invoice (2026-06-12)

**Choice:** `estimate_line`, `job_line`, `invoice_line`, and `po_line` store **copied** description/qty/price at creation time; live catalog joins are not used for billed amounts.

**Rationale:** Standard trades accounting; prevents retroactive price drift.

### Decision: SQL-first persistence (inherits platform 2026-06-11)

**Choice:** Business DDL in `migrations/014+`; single-table store SQL from codegen; hand-written `repository.ts` for multi-table / collection Surfaces.

**Rationale:** Platform decision — see [codegen scope](../../../packages/codegen/docs/reference/codegen-scope.md).

### Decision: desktop-only (2026-06-12)

**Choice:** No mobile layout investment; Ant Design master-detail at fixed breakpoints.

**Rationale:** Owner request; Ant Design targets desktop workflows.

### Decision: shared root shell — nav varies by session (2026-06-12)

**Choice:** `AppShell` (sider + header + content) mounts in **root** `layout.tsx` for all routes. Public and `(private)` pages share the same chrome. Login/logout changes **nav items** (and header user menu), not whether the shell renders. Private-route session gates run in **pages** via `requireAuth`, not in `(private)/layout.tsx`.

**Rationale:** Consistent chrome; login stays in-context (sidebar visible). Root layout passes `authenticated` for nav; call `router.refresh()` after login/logout (layouts may not re-check session on every client navigation). Manifest-filtered nav lands in task 05.

### Decision: three nav sources — public, session, manifest (2026-06-12)

**Choice:** Sidebar merges three lists: **(1)** public routes always shown (e.g. Home `/`); **(2)** session chrome shown when authenticated but not manifest-gated (e.g. Settings `/settings`); **(3)** Surface catalog entries filtered server-side via `resolveContext` per `surfaceId`. Static lists live in `lib/nav.ts`; filtering in `lib/nav-server.ts`.

**Rationale:** Public and app-chrome links are not Surfaces; manifest filtering applies only to business/IAM list entry points. Keeps Home visible when logged out without faking a Surface grant.

### Decision: sidebar nav uses `next/link` for route prefetch (2026-06-12)

**Choice:** Sidebar menu item labels wrap **`next/link`** (default `prefetch` on in production). Selection state uses `usePathname()`. Do **not** navigate the sidebar with `router.push` alone — that skips App Router RSC route prefetch.

**Rationale:** Static explicit hrefs (`/iam/users`, `/contacts`, …) benefit from viewport/hover prefetch. List-row navigation and optional React Query `prefetchQuery` remain separate concerns. See [routing-and-libraries.md](./routing-and-libraries.md).

### Decision: sidebar grouping — chrome flat, Surfaces in Menu groups (2026-06-13)

**Choice:** `SideNav` uses Ant Design `Menu` **`mode="inline"`**. Three nav sources render as:

1. **Public** — top-level items, no `type: 'group'` (e.g. Home).
2. **Session chrome** — top-level items when authenticated, no group (e.g. Settings). Optional `type: 'divider'` before manifest groups.
3. **Surface catalog** — `type: 'group'` per catalog `group` field (e.g. IAM, Contacts). Flat links under each group — no `SubMenu` nesting. Omit an entire group when no Surface in it passes manifest filter.

**Rationale:** Public and session links are **app chrome** (not Latch Surfaces, not manifest-gated). IAM/Contacts/etc. **are** Surfaces — grouped and filtered server-side. Mixing chrome into Surface groups would blur the security model and complicate `nav-server.ts`.

### Decision: shell chrome layers — sidebar, app header, page toolbar (2026-06-13)

**Choice:** Three horizontal/vertical zones, not one `Menu` for everything:

| Zone | Location | Purpose | Ant pattern |
|------|----------|---------|-------------|
| **Sidebar** | `Layout.Sider` | Route navigation (where can I go?) | `Menu mode="inline"` + `next/link` labels |
| **App header** | Root `Layout.Header` | Global chrome: title, optional global search, account/settings dropdown | `Flex` + `Input.Search` + `Dropdown` |
| **Page toolbar** | Per-route layout / content top | Surface actions (New, Delete, Save, …) | `Flex` / `Space` + `Button` — **not** `Menu` |

**App header dropdown** (extends `UserMenu`): login / sign out now; link to `/settings` optional; theme and density later. Session auth chrome stays in the header dropdown — not in the Surface catalog.

**Rationale:** Matches Ant Design [Header-Sider application layout](https://ant.design/components/layout): primary nav in the sider, global utilities in the header, contextual actions in the working area. Horizontal `Menu` is for site-level navigation categories, not CRUD buttons.

### Decision: SurfaceToolbar — priority actions + overflow menu (2026-06-13)

**Choice:** Per-page toolbars use **`SurfaceToolbar`**: a horizontal row of `Button`s (and optional page-local `Input.Search`), gated by `<Can>`. **Pattern A — priority + overflow:** each action declares `priority: 'primary' | 'secondary'`. Primary actions stay visible in the bar; secondary actions move into a **More** (`⋯`) `Dropdown` when space is tight or on compact breakpoints. Do **not** use `Menu mode="horizontal"` for toolbar actions.

**Rationale:** Toolbar is a list of controls, not navigation. Overflow via `Dropdown` preserves button semantics (disabled, danger, modals). Desktop-only scope still requires narrow-window / half-screen behavior — see [routing-and-libraries.md](./routing-and-libraries.md#surface-toolbar).

### Decision: first-run setup — no SQL user seed (2026-06-13)

**Choice:** Platform migrate leaves **`latch_users` empty**. First admin via **`/setup`**: validate `LATCH_SETUP_KEY`, collect **login_name** + password, create user with `system_data` + `system_iam`. Migration `013_latch_identity_guards.sql` adds `login_name`, `setup_complete`, and DB triggers (immutable `role_class`, system catalog not deletable, last system-role holder not revocable). DAL mirrors last-holder guard. No `bootstrap-admin`, no SQL dev user seed.

**Identity:** `login_name` is the setup login identifier. `login_email` stays null until linked from `party_email` (task 10+). **Address-book display name** on `party`; **session chrome** (shell label, avatar) on draft `party_user` when linked — not on `latch_users`. Until `party_user` ships, interim staff link via `employee.latch_user_id`. Sign-in accepts username or linked email (`resolveLatchUserId`).

**Rationale:** Matches production bootstrap (customer chooses admin identity). `PolicyService` synthesizes IAM for `system_iam` — no grant seed. Platform-locked: [P4b amendment](../../../packages/policy/docs/tasks/00-decisions-needed.md#amendment-first-run-setup--db-identity-guards-2026-06-13) + [scaffold runbook](../../../packages/codegen/docs/scaffold-runbook.md#first-run-setup).

### Decision: Slice 0 dev seed — single master user, system roles (2026-06-13) — **superseded**

**Superseded by** [first-run setup](#decision-first-run-setup--no-sql-user-seed-2026-06-13) above.

### Decision: row timestamps vs audit — DDL vs Surface Fields (2026-06-13)

**Choice:** Three layers, not one global rule:

| Layer | Rule |
|-------|------|
| **`latch_audit`** | Authoritative for **who / when / what changed** on mutations (history, compliance, restore). |
| **DDL convenience columns** | `created_at` / `updated_at` on **business anchor** tables (`party`, `job`, `estimate`, …) for list sort and “last edited” without joining audit. **`created_by`** deferred until `own` row scope or owner UI is needed. **Platform IAM catalog** (`latch_roles`, grants, bindings): no row timestamps — per [P11](../../../packages/policy/docs/tasks/00-decisions-needed.md#p11--role-catalog-shape-uuid--role_class-2026-06-08). Legacy `latch_users.created_at` may remain in DDL but is not a Surface Field. |
| **Surface YAML** | Map a column to a Field only when the UI/API needs it **and** manifest should gate read/write. Do **not** expose audit-metadata (`created_at`, `created_by`) on IAM surfaces; omit on business surfaces unless product requires manifest-gated display. |

**Rationale:** Audit and row timestamps answer different questions; lighter audit modes (`standard`, `recovery`) do not always record enough on `insert` to replace `created_at` for list UX. Surface Fields add patch surface area — metadata columns should not be writable via PATCH unless explicitly intended.

### Decision: party_role master tags vs job-scoped relations (2026-06-15)

**Choice:** Two layers — do not overload `party_role` with job context.

| Layer | Table | Purpose |
|-------|-------|---------|
| **Master tags** | `party_role` | Address-book classification; drives filtered list Surfaces; **editable** on `contact_detail` (logical Field, multi-select) |
| **Job stakeholders** | `job_party` *(job slice)* | Per-job counterparty graph: customer, owner, bill-to, GC, sub chain, etc. |

**Master `party_role` enum (v1):** `customer`, `vendor`, `manufacturer`, `employee`, `property_owner`, `other`.

- **Not** master tags: `general_contractor`, `subcontractor` — express these on `job_party` (the GC may *also* be tagged `customer` in the address book).
- **`employee`** remains a master tag for internal staff; staff HR fields on `employee` table — [deferred columns](#decision-employee-hr-fields-deferred-2026-06-16). Login linkage moves to `party_user` in the [party identity slice](#decision-party-identity--party_user--user_class-deferred-2026-06-15) (interim: `employee.latch_user_id`).

**Rationale:** Same site can host jobs with different customer/owner graphs (e.g. GC on one job, building owner direct on another). Master tags answer “who is this party to us generally?”; job relations answer “who plays which part on *this* engagement?”

**Service vendors (parts vs labor):** Master tag `vendor` covers **parts** supply (`vendor_part_price`, `purchase_order`). **Labor / subcontract scope** is not a standing vendor catalog — express on `job_party` with relation `subcontractor` (from `job_party_relation`) and scoped work on `estimate_line` / `job_line`. Same `party` may be tagged `vendor` in the address book and appear as `subcontractor` on a specific quote/job.

### Decision: party list/detail Surface shape — deferred (2026-06-16)

**Status:** Deferred — revisit after more domain DDL is designed (catalog, estimate/job slices) and before Slice 3+ Surfaces harden routes.

**Locked (data model):** One `party` anchor; `party_role` master tags; no separate manufacturer/vendor tables. See [party spine](#decision-party-spine-for-contacts-2026-06-12).

**Open (UI):** How `party` maps to Latch Surfaces is **not decided**. Candidate directions (may combine):

| Direction | Sketch |
|-----------|--------|
| **Unified party Surface** | One list (and possibly one detail) with **filters** for `party_role` — single address book, role as tab/filter rather than many nav entry points |
| **Role subset lists** *(partially shipped)* | Separate list Surfaces (`contact_list`, `customer_list`, `vendor_list`, `manufacturer_list`, `employee_list`) — same `party` anchor, DAL filters by tag |
| **Role-specific detail** | `vendor_detail` / `manufacturer_detail` with catalog child collections (`vendor_part_price`, `manufacturer_part`) vs one shared `contact_detail` for all parties |

**Not in scope for this fork:** Job-scoped `subcontractor` — stays on `job_party`, not master `party_role`.

**Interim:** Keep Slice 1 as shipped (`contact_detail` + filtered list Surfaces). Do not block schema or migration work on this choice.

### Decision: site vs location — separate entities (2026-06-15)

**Choice:** **`site`** = logical place (portfolio, campus, property, job site). **`location`** = normalized physical address / geocode record. **Do not** embed address columns on `site` and **do not** link `site` to `location` — party and job junctions only.

| Entity | Holds |
|--------|--------|
| `site` | `name`, optional `parent_site_id` (hierarchy) — no inline `notes` ([shared notes](#decision-notes-and-attachments-shared-tables-deferred-2026-06-15)) |
| `location` | Address lines, `city`, `state`, `postal_code`, `country`, optional `lat`/`lng`, `label` — manual entry in v1 |

**Rationale:** One address row can attach to a party and (later) a job work area without duplication. Site hierarchy supports portfolio → building → wing without conflating “where on the map” with “what we call this place in the business.” **Sites do not link to `location`** — no `site_location` junction (2026-06-16).

### Decision: location attachments (2026-06-15)

**Choice:** `location` is shared. **`party_location`** and **`job_location`** use a junction **`purpose`** column — the role of that address in the link. **`site` has no location attachment** — logical place only. Use `location.label` for human place names (“Suite 1200”, “Floors 3–5”) when scoping work on estimate/job lines.

| Junction | Slice | When to use |
|----------|-------|-------------|
| `party_location` | **2** (task 17) | Billing / HQ / mailing for this party |
| `job_location` | **5** (job slice) | Work area for this job |

Same `location` id may appear on multiple junctions.

#### `purpose` — examples

**`party_location`** — one org, different addresses for different functions:

| `purpose` | Example |
|-----------|---------|
| `hq` | Corporate office on file |
| `billing` | Where invoices are mailed |
| `remit_to` | Lockbox / AP address (≠ billing) |
| `mailing` | Marketing / statements |
| `other` | Warehouse ship-from |

**`job_location`** *(job slice)* — work happens at the site but not everywhere:

| `purpose` | Example |
|-----------|---------|
| `work_area` | Tenant fit-out on floor 12 only |
| `mdf_room` | IDF/MDF closet 12-401 |
| `floor` | Phased job — floors 3–5 this phase |

**Concrete combo:** Location row `id=L1` = “200 Market St, San Francisco”. `party_location (party=Tower REIT, L1, hq)`. `job` at `site=Tower` later: `job_location (job=Phase-2, L1, floor)` with `location.label` = “Floors 3–5” or a separate location row for a suite.

**Rationale:** Slice 2 ships `party_location`; `job_location` DDL waits for the `job` anchor table in the job slice but uses the same `location` shape — no redesign later.

### Decision: in-building work scope — estimate → job lifecycle (2026-06-16)

**Choice:** **`site` is a logical place only** — no street address on the site row and no `site_location` junction. **Where inside the building** work happens or items are installed is scoped in the **estimate → job** lifecycle (Slices 4–5). Property-level street address (when needed) comes from the **owner/customer** (`party_location`) or from **job/line** `location` rows.

| Layer | Table / field | Example |
|-------|----------------|---------|
| Logical place | `site` | 200 Market Tower |
| Owner / customer address | `party_location` → `location` | Tower REIT HQ at 200 Market St |
| Logical subdivision | `site.parent_site_id` | “Floors 3–5” as child site under the tower |
| Job work area | `job_location` → `location` | Phase-2 fit-out — floor 12; `location.label` = “Suite 1200” |
| Line / item placement | `estimate_line.location_id`, `job_line.location_id` *(planned)* | AHU install in MDF 12-401; cable homerun to IDF 3 |

**Flow:** Quote on `estimate` at a `site_id`. Lines may reference a `location_id` (within-building place) when quoting scoped work or installed equipment. Won quote → `job` copies site + line snapshots; `job_location` and line `location_id` carry where techs work and where assets land. Billing address stays on the **customer** (`party_location` purpose `billing`, or `job_party` `bill_to`) — not on `site_contact`.

**Rationale:** Service tickets and install jobs need “where in the building,” but that varies per engagement and line item. Sites name the property in the portfolio; physical address and in-building scope belong on party and estimate/job — not a standing site↔location link.

### Decision: address verification — deferred (2026-06-15)

**Choice:** **Defer** third-party address verification and autocomplete (type-ahead) to a later slice. Slice 2 `location` DDL is **manual entry** — address lines, city, state, postal code, country, optional `lat`/`lng`. No verification provider columns, no geocoder integration, in task 17.

**Rationale:** Primary payoff of verification APIs is **type-ahead UX** at data entry time; that belongs with `site_detail` / `contact_detail` UI work, not bare DDL. Add `verified_at` / provider metadata when a vendor is chosen.

### Decision: site contacts — `site_contact_relation` catalog (2026-06-15)

**Choice:**

- **`site_contact_relation`** — catalog table (`id`, `display_name`, `sort_order`). Seeded defaults in DDL migration only if discussed ([seeding rule](#decision-business-data-seeding-2026-06-15)); otherwise empty catalog at migrate time. **Admin UI:** dedicated [catalog table Surface](#decision-catalog-tables--editable-table-page-not-master-detail-2026-06-16) (`site_contact_relation_table`), not master-detail. No `code` column — use `id` for FKs; display names are admin-editable.
- **`site_contact`:** `site_id` + `party_id` + `relation_id` FK → `site_contact_relation`. Standing people/orgs at a property. **Not** a substitute for `job_party`.
- **No inline `notes`** on `site_contact` — use [shared notes](#decision-notes-and-attachments-shared-tables-deferred-2026-06-15) when that slice lands.
- **Billing contact** is on the **customer** (`party` / `party_location` billing, or `job_party` `bill_to`) — not a `site_contact_relation` row.

Suggested first-use relation rows (display names, not DDL seed): Property owner, Property manager, Site superintendent, Other — collected via [progressive setup](#decision-progressive-setup--master-catalogs-2026-06-16) when the app is first used.

**Rationale:** Relation labels will grow; a catalog avoids repeated CHECK migrations. Job-scoped relations (`job_party`) may get a parallel catalog in the job slice.

**Locked (task 16, 2026-06-16):** **Empty catalog at migrate time** — task 17 creates `site_contact_relation` with no `INSERT`s in `019_site.sql`. First rows in production via progressive setup UI; local QA via approved dev seed `020_site_contact_relation_dev_seed.sql` ([progressive setup](#decision-progressive-setup--master-catalogs-2026-06-16)); no hard-coded seed ids.

### Decision: Slice 2 UI scope — planning gate (2026-06-16)

**Choice (task 16):**

| Topic | Slice 2 | Deferred |
|-------|---------|----------|
| `site_contact_relation` DDL | Empty table (task 17) | Default rows in DDL migration |
| `site_detail` standing contacts | `contacts` child collection (tasks 18–19) | — |
| Relation catalog population | Progressive setup (suggestions) + `site_contact_relation_table` page | DDL `INSERT`s |
| `party_location` DDL | Task 17 (`location` + junction) | — |
| `party_location` on `contact_detail` | — | After more domain DDL ([task 20](./tasks/01-task-index.md#slice-02--sites)) — surfaces/fields need estimate/job context |
| `site.parent_site_id` DDL | Task 17 (nullable self-FK) | Parent-site picker and list parent column |
| `party_location.purpose` CHECK | `billing`, `remit_to`, `hq`, `mailing`, `other` (task 17) | — |
| `site_location` junction | — | Never — sites are logical only ([in-building scope](#decision-in-building-work-scope--estimate--job-lifecycle-2026-06-16)) |

**Tasks 18–19 headline (Slice 2 exit):** `/sites` master-detail like `/contacts`. `site_list`: `name` (flat list — no parent column). `site_detail`: `name` CRUD + `contacts` child collection (`party_id`, `relation_id` from catalog per [child-collections.md](./child-collections.md)). **`site_contact_relation_table`:** single-page editable catalog at `/sites/contact-relations` ([catalog table decision](#decision-catalog-tables--editable-table-page-not-master-detail-2026-06-16)) — not list/detail. No address block on site.

**Rationale:** Ship minimal sites UI and standing-contact wiring while deferring hierarchy, party addresses, and catalog DDL seeds until the broader schema (estimates, jobs) clarifies surface/field shapes.

### Decision: progressive setup — master catalogs (2026-06-16)

**Choice:** Master/catalog tables that block downstream forms (`site_contact_relation`, and similar catalogs in later slices) are populated through **progressive first-use setup** — a series of guided forms with **suggested defaults**, not automatic DDL seeds. This pattern recurs as new slices add catalogs. **Regardless of setup**, each catalog also gets a permanent [catalog table page](#decision-catalog-tables--editable-table-page-not-master-detail-2026-06-16) for ongoing edit.

| Layer | When | What |
|-------|------|------|
| Runtime setup | First use / empty catalog | Wizard or inline prompts; user confirms or edits suggestions |
| Catalog table page | Always (same slice as consuming UI) | Editable table Surface — add/edit/delete rows any time |
| Dev seed | Local QA only, when advised | Approved `*_dev_seed.sql`; Postgres-assigned ids only ([seeding rule](#decision-business-data-seeding-2026-06-15)) |
| DDL migration | Task 17+ | Table shape only — no business `INSERT`s unless explicitly re-decided |

**Dev workflow:** When a slice needs catalog rows for manual testing, task docs or migration notes **advise** whether a dev seed is needed — do not add seeds or hard-coded ids without discussion. Example: standing contacts on `site_detail` need at least one `site_contact_relation` row before the relation picker is usable.

**Approved dev seed (2026-06-16):** `migrations/020_site_contact_relation_dev_seed.sql` — four suggested relation display names; Postgres-assigned ids; idempotent on `display_name`. DDL migration `019_site.sql` stays empty; seed is a separate migration for local QA only.

**Rationale:** Catalog content is a product choice; first-run UX should teach the model. DDL seeds fight the empty-catalog default and leak fixed ids into docs and tests.

### Decision: installed systems — deferred to catalog slice (2026-06-15)

**Choice:** **Drop `site_system` from Slice 2** (task 17). Installed assets at a site will be modeled later as **rows tied to catalog items/parts**, not a free-text equipment register.

**Services — three layers (unchanged intent; shifted timing):**

| Layer | Where | Slice |
|-------|--------|-------|
| Installed assets at site | TBD — linked to `item` / parts | 3+ (with catalog) |
| Sellable offerings (SKUs) | `item` / catalog | 3 |
| Scoped work on an engagement | `job_line` / job scope | 5 |

**Rationale:** Equipment without catalog linkage duplicates manufacturer/model text and fights the parts domain. Site slice delivers place + addresses + standing contacts only.

### Decision: notes and attachments — shared tables (deferred) (2026-06-15)

**Choice:** **Do not** add ad-hoc `notes TEXT` columns on business anchors (`party`, `site`, `site_contact`, …). **Deferred** shared model:

- `note` — polymorphic (`entity_type`, `entity_id`, body, plain/rich format, …)
- `attachment` — polymorphic files/images

Surfaces expose logical Fields (`notes`, `attachments`) on any anchor. Slice 2 DDL omits inline notes columns on new tables.

**Schema view:** [`schema/current.dbml`](./schema/current.dbml) shows `note` in the `cross_cutting` group. Reuse the same `entity_type` vocabulary as `latch_audit.entity_type`. Interim `party.notes` in migration `016` migrates to `note` rows when the notes migration lands — do not add `party_note` or other anchor-specific note tables.

**Rationale:** Notes and files are cross-cutting; one pattern beats scattered text columns.

### Decision: site contacts and systems (2026-06-15) — **superseded**

**Superseded by** [site contacts — `site_contact_relation` catalog](#decision-site-contacts--site_contact_relation-catalog-2026-06-15) and [installed systems — deferred](#decision-installed-systems--deferred-to-catalog-slice-2026-06-15) above.

### Decision: job anchor and stakeholders — deferred to job slice (2026-06-15)

**Choice:** `job` (and `job_party`, `job_location`, estimates, lines) are **out of Slice 2**. Locked contract for Slice 5:

- `job.site_id` NOT NULL → where work happens
- `job_party (job_id, party_id, relation_id)` — `relation_id` FK → **`job_party_relation`** catalog ([schema-first decision](./decisions.md#decision-schema-first--finish-dbml-before-migrations-2026-06-16)); suggested display names include: `customer`, `property_owner`, `bill_to`, `sold_to`, `general_contractor`, `subcontractor`, `subcontract_through`
- No `customer_id` column on `site` or `job` as the sole counterparty link

**Rationale:** Site slice establishes place + standing contacts; job slice adds engagement-specific stakeholder flexibility without painting Slice 2 into a single-FK corner.

### Decision: party identity — `party_user` + `user_class` (deferred) (2026-06-15)

**Choice:** **Deferred** — hold DDL until we have a clearer picture of **who** may log in (staff only vs customers, GCs, site contacts, etc.). Document now in [`schema/current.dbml`](./schema/current.dbml); do **not** implement in Slice 2.

| Piece | Intent |
|-------|--------|
| `party_user` | Person ↔ `latch_users` bridge for **any** SubHub login (not only staff). FK → `party_person` (persons only — orgs do not log in). Opt-in: most contacts never get a row. |
| `party_user` profile | Session-facing fields on the link row: `display_name` (shell override, fallback `party.display_name`), `avatar_url` (URL until polymorphic `attachment` lands). Credentials stay on `latch_users`; structured name on `party_person`. |
| `latch_users.user_class` | `internal` \| `external` — separates staff auth plane from customer/partner portal principals |
| Portal app roles + row scope | External users see only data tied to their party / `job_party` rows |

**Interim (shipped):** staff login via `employee.latch_user_id`; migrate to `party_user` when the identity slice lands. Customer portal and external row scope remain out of scope until then.

**Rationale:** Identity generalization is platform-shaped (principal kind, scoped manifests). Exact portal audience (stakeholders, GCs, customers) is still being defined — `party_user` avoids overloading `employee` with non-staff logins. Slice 2 proceeds on sites/locations without blocking on Latch policy changes.

### Decision: employee HR fields (deferred) (2026-06-16)

**Choice:** `employee` is a **staff-only** extension row (FK → `party_person`, `party_role` tag `employee`). **Do not add HR columns to DDL yet.** Document planned fields in [`schema/current.dbml`](./schema/current.dbml) `Note` on `employee`:

| Planned column | Purpose |
|----------------|---------|
| `hire_date`, `termination_date` | Employment lifecycle |
| `employee_number` | Payroll / badge id |
| `job_title` | Business title (≠ Latch IAM role) |
| `department` or `primary_scope_id` | Org structure / branch |
| `reports_to` | FK → `employee` — management chain |
| `employment_status` | e.g. active, on_leave, terminated |
| `primary_site_id` | Home office / default dispatch (Slice 2+ `site`) |

**Not on `employee`:** name (`party_person`), list display (`party`), phones/emails (`party_phone` / `party_email`), login (`party_user`), permissions (`latch_user_roles`).

**Rationale:** Slice 1 needs a staff marker and surfaces, not a full HR module. Lock the field list now so `party_user` and portal identity do not absorb staff-only data.

### Decision: business data seeding (2026-06-15)

**Choice:**

1. **Do not add business seed migrations** (`*_dev_seed.sql`, fixture `INSERT`s in DDL tasks) **without prior discussion** — default for new slices is **DDL only**.
2. When seeding **is** approved: let Postgres assign ids (`DEFAULT gen_random_uuid()::text` or `INSERT … RETURNING id`); **do not** hard-code string ids like `seed-party-acme` in new seeds.
3. **`/setup`** (first admin user) is not business seeding — it stays the only runtime identity bootstrap.

**Rationale:** Fixed seed ids leak into docs, tests, and manual QA paths and fight the repo’s normal id convention. Seeds are a product choice (what demo data exists), not an automatic deliverable per migration task. Historical seeds (e.g. `017_party_dev_seed.sql`) predate this rule; do not extend that pattern without explicit approval.
