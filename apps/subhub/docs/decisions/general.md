# SubHub decisions — general

> App shell, routing, nav, Latch patterns, schema process, and cross-cutting UI conventions.

[Index](./README.md) · [All decisions](./README.md)

---

### Decision: Surface catalog before migrations (2026-06-17)

**Choice:** After the schema design pass ([task 17](../tasks/17-schema-design-pass.md)), pause the implementation track and complete a **holistic Surface & Field catalog** ([`surfaces.md`](../surfaces.md), [task 18](../tasks/18-surface-catalog.md)) before writing the next business SQL batch. Slices remain useful labels; **implementation waves** in the task index are the ship sequence.

| Artifact | Role |
|----------|------|
| [`surfaces.md`](../surfaces.md) | Canonical UI/policy contract — Fields, routes, waves |
| [`tasks/deferred/site-migration.md`](../tasks/deferred/site-migration.md) | Preserved wave 1 DDL spec (former task 18) |
| [`current.dbml`](../schema/current.dbml) | Table/column source of truth |

**Rationale:** Schema answers what exists; Surfaces answer what users see and change under policy. Designing Fields across the full v1 map avoids migration/UI rework when later slices (estimates, jobs, billing) clarify child collections and pickers. Delivery still lands in waves — design is holistic, ship is incremental.

**Amended (2026-06-18):** Discuss Surfaces at **implement-spec** depth (schema + fields + policy + DAL + UI in chat) **before** migrations or UI — as in the IAM identity thread leading to [party identity](./party.md#decision-party-identity--party_person-login-link-2026-06-18). One spec file per Surface group; fold decisions into DBML + `decisions/` in the same pass.


### Decision: schema-first — finish DBML before migrations (2026-06-16)

**Choice:** Defer task **18** (site migration SQL) until [`schema/current.dbml`](../schema/current.dbml) covers **Slices 2–6** at column level and open FK forks are locked. Iterate DBML + decisions + architecture per [`schema/README.md`](../schema/README.md); **no new `migrations/*.sql`** until task **17** (schema design pass) exits.

**Rationale:** Shipped `016_party.sql` already diverges from the design target (`party_person`, `note`, `employee` → `party_person`). Sites and downstream slices share FK graphs (estimate → job → invoice, line snapshots, relation catalogs). Designing holistically avoids migration churn and second refactor passes. Implementation still lands in delivery slices (Surfaces/DAL/UI per slice); SQL batches follow the stabilized ERD.

**Locked in DBML (task 17):**

| Topic | Choice |
|-------|--------|
| Engagement stakeholders | `estimate_party` + `job_party` via **`job_party_relation`** catalog (not master `party_role` for GC/sub) |
| Quote / job anchor | `estimate.site_id`, `job.site_id` NOT NULL; **no** sole `customer_id` on `job` or `site` |
| Vendor SKU + price | **`vendor_part`** — vendor PN + current price; UOM from `manufacturer_part` only |
| Item kinds | `item.kind` CHECK: `product`, `labor`, `assembly`, **`expense`** |
| Categories | **`category`** tree with optional `csi_code`; quote sections use `category_id` |
| Item costing | `default_part_id` + `default_vendor_part_id` on `item` |
| Sold vs buy scope | **`job_line`** + **`job_line_part`** (3C) |
| Site geography | **`site_section`** (flat) + **`site_location`**; provenance via **`latch_audit`** |
| Field status | **`job_work_item`** |
| Engagements | **`job.job_kind`** — project / service / warranty |

**Still deferred:** `attachment`, address verification, `latch_users.user_class` (portal), employee HR columns, Slice 7 report SQL, `margin_rule`, `labor_rate` / `burden_profile`, **`job_phase` scheduling (v2)**, **`site_audit`** (typed geography timeline — use `latch_audit` until needed), `installed_asset` registry, vendor price history, `classification_system`, **org-wide warehouse WMS**.


### Decision: single `/login` page — no modal (2026-06-12)

**Choice:** One `/login` route with an inline form inside the root shell. Voluntary login (header/user menu) and auth gating both navigate to `/login?callbackUrl=…`. No separate login modal. `/login` lives under **`(public)`**, not `(private)`.

**Rationale:** Simpler than dual modal + page paths; shell chrome stays consistent. `callbackUrl` returns the user to the public page they came from or the private route they intended. Failed sign-in stays on `/login`. Manifest 403/404 on the destination is separate from authentication.


### Decision: no `proxy.ts` / `middleware.ts` for auth (2026-06-12)

**Choice:** SubHub does **not** use Next.js `proxy.ts` (formerly `middleware.ts`) for session gating or `callbackUrl` plumbing.

**Rationale:** Next.js 16 renamed middleware to proxy to clarify it is a **network boundary** (rewrites, fast redirects) — not an application auth firewall. Authoritative checks belong in layouts, pages, and the DAL. Injecting `x-pathname` via proxy to work around layout limitations couples auth to the wrong layer. See [routing-and-libraries.md](../routing-and-libraries.md#auth-gating).


### Decision: per-page `requireAuth(path)` for private routes (2026-06-12)

**Choice:** Each `(private)` page calls `requireAuth('/explicit/path')` at the top of the Server Component. The helper reads `readBetterAuthSession`; on failure, `redirect(loginHref(path))`. Voluntary login from `UserMenu` builds `callbackUrl` client-side via `usePathname()`.

**Rationale:** Server layouts cannot read the current URL (intentional Next.js design for partial rendering). SubHub already uses explicit routes — each page knows its href. Fits dynamic routes (`/contacts/[id]` → `` requireAuth(`/contacts/${id}`) ``). `(private)/layout.tsx` stays a passthrough; no `/login` exemption hack.


### Decision: SubHub is the primary Latch consumer app (2026-06-12)

**Choice:** Build SubHub as the real trades/AV integration app on the scaffolded template (`apps/subhub`), developing `@latch/*` in parallel when gaps appear.

**Rationale:** Platform packaging (Phase 09) is complete; a full domain app is the right proof and product driver.


### Decision: no approval / verification workflow (2026-06-12)

**Choice:** SubHub v1 excludes pending changes, accept/reject, and `requires_verification` Fields.

**Rationale:** Owner request; simplifies DAL and UI paths while the domain model is still evolving.


### Decision: explicit routes — no catch-all surface pages or APIs (2026-06-12)

**Choice:** **Do not** use dynamic catch-all routes such as `app/[surface]/page.tsx` or `api/surfaces/[surfaceId]/[id]/route.ts`. Each domain gets explicit App Router segments and API route files (`contacts/[id]`, `api/contacts/[id]`). Entity id segments (`[id]`) are fine.

**Rationale:** Forms, toolbars, and multi-table layouts differ per Surface; a generic page would accumulate exceptions. Shared **factories** (`createSurfaceRouteHandlers`, DAL descriptors) still deduplicate server logic — only the route **files** stay explicit. See [routing-and-libraries.md](../routing-and-libraries.md).


### Decision: master-detail via nested layout, not parallel routes (2026-06-12)

**Choice:** List + detail uses a **shared parent `layout.tsx`** (list in the layout, detail in child `page.tsx` / `[id]/page.tsx`). **Do not** use parallel route slots (`@list` / `@detail`) in v1.

**Rationale:** Parallel routes add slot wiring, soft-navigation edge cases, and duplicate data-fetch coordination for modest gain. Nested layouts keep the list mounted when switching ids, URLs stay shareable (`/contacts/abc`), and implementation matches prior CRM split-shell learning without `?id=` query strings. Revisit parallel routes only if independent `loading.tsx` / `error.tsx` per pane becomes a measured need.


### Decision: cross-Surface related records — navigation only v1 (2026-06-18)

**Choice:** When one Surface surfaces **related** rows owned by another Surface (customer hub → job, site, invoice; job → customer), v1 uses **manifest-gated navigation** to the target’s **canonical route** (`/jobs/[id]`, `/sites/[id]`, …). **No** drawer or modal hosting a full foreign Surface form in v1.

| Pattern | v1 | Later |
|---------|-----|-------|
| Link row / tree leaf → open record | `<Link>` / `router.push` + auto-select in master-detail layout | — |
| Read-only summary on hub | Synthetic Fields (`related_jobs`, `related_invoices`) — omit when no target `read` grant | Optional drawer peek |
| Quick create contact / subsidiary | Inline action or small create form on **same** Surface; full edit on target lens URL | — |

**Rationale:** Each Surface keeps its own policy boundary, toolbar, and URL. Re-resolve manifest on navigation ([`access-control.md`](../../../packages/policy/docs/access-control.md)); avoids ambiguous Save/delete scope. Drawer previews revisited after hub ships.


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

**First instance:** `site_contact_relation_table` in wave 1 — fields `display_name`, `sort_order` ([`surfaces.md`](../surfaces.md)).

**Rationale:** Master-detail splits a sparse catalog across list + detail panes for no gain. An editable table matches how admins think about lookup tables and guarantees an edit path when DDL starts empty or progressive setup is skipped.

### Decision: UI dependencies (2026-06-12)

**Choice:** Ant Design 6 + `@ant-design/nextjs-registry`, React Hook Form + `@hookform/resolvers` (Zod from codegen), TanStack Query v5. `@latch/react` for `<Can>` / `<FieldControl>` / `CapabilitiesProvider`.

**Rationale:** Owner request; alignment table from [UI sync discussion](../../../packages/_docs/discussions/06-ui-sync.md) still applies (omit / read-only / editable from manifest).


### Decision: child collections as logical Fields (2026-06-12)

**Choice:** Related rows (phones, emails, line items) are **logical Fields** on the parent detail Surface — projected as arrays in the DTO, patched via strict Zod array keys, edited with RHF `useFieldArray`. v1 patch semantics: **replace whole collection** on save for that Field.

**Rationale:** Fits Latch Field vocabulary; avoids a Surface per child row. Canonical pattern: [child-collections.md](../child-collections.md).


### Decision: line-item snapshots on estimate → job → invoice (2026-06-12)

**Choice:** `estimate_line`, `job_line`, `invoice_line`, and `purchase_order_line` store **copied** description/qty/price at creation time; live catalog joins are not used for billed amounts.

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

**Rationale:** Static explicit hrefs (`/iam/users`, `/contacts`, …) benefit from viewport/hover prefetch. List-row navigation and optional React Query `prefetchQuery` remain separate concerns. See [routing-and-libraries.md](../routing-and-libraries.md).


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

**Rationale:** Toolbar is a list of controls, not navigation. Overflow via `Dropdown` preserves button semantics (disabled, danger, modals). Desktop-only scope still requires narrow-window / half-screen behavior — see [routing-and-libraries.md](../routing-and-libraries.md#surface-toolbar).


### Decision: first-run setup — no SQL user seed (2026-06-13)

**Choice:** Platform migrate leaves **`latch_users` empty**. First admin via **`/setup`**: validate `LATCH_SETUP_KEY`, collect **login_name** + password, create user with `system_data` + `system_iam`. Migration `013_latch_identity_guards.sql` adds `login_name`, `setup_complete`, and DB triggers (immutable `role_class`, system catalog not deletable, last system-role holder not revocable). DAL mirrors last-holder guard. No `bootstrap-admin`, no SQL dev user seed.

**Identity:** `login_name` is the setup login identifier. **Target (2026-06-18):** `latch_users.login_email` (nullable, UNIQUE) — app copies from `party_email.is_login_email`; session chrome on `party_person`; link via `party_person.latch_user_id`. Provision login from person Surfaces (`add_as_db_user`), not IAM user Surface. Sign-in: `login_name` or `login_email` on `latch_users` only (`resolveLatchUserId`). **Shipped interim:** `employee.latch_user_id` until identity implementation wave; `login_email` column already on `latch_users`.

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
