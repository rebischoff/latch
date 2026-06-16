# SubHub — decisions

> Lock choices here before implementation tasks. Add a dated **Decision** block when something new is settled.

## Open

_None._

---

## Decided

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

**Choice:** One `party` table (`kind`: `person` \| `organization`) with `party_role` tags (`customer`, `vendor`, `manufacturer`, `employee`). Subset list Surfaces filter by role; one `contact_detail` Surface for CRUD.

**Amended (2026-06-15):** Master role enum expanded and split from job-scoped relations — see [party_role master tags vs job-scoped relations](#decision-party_role-master-tags-vs-job-scoped-relations-2026-06-15).

**Rationale:** Avoids duplicate CRUD across Customer/Vendor/Manufacturer tables; matches “subset of contacts” language.

### Decision: explicit routes — no catch-all surface pages or APIs (2026-06-12)

**Choice:** **Do not** use dynamic catch-all routes such as `app/[surface]/page.tsx` or `api/surfaces/[surfaceId]/[id]/route.ts`. Each domain gets explicit App Router segments and API route files (`contacts/[id]`, `api/contacts/[id]`). Entity id segments (`[id]`) are fine.

**Rationale:** Forms, toolbars, and multi-table layouts differ per Surface; a generic page would accumulate exceptions. Shared **factories** (`createSurfaceRouteHandlers`, DAL descriptors) still deduplicate server logic — only the route **files** stay explicit. See [routing-and-libraries.md](./routing-and-libraries.md).

### Decision: master-detail via nested layout, not parallel routes (2026-06-12)

**Choice:** List + detail uses a **shared parent `layout.tsx`** (list in the layout, detail in child `page.tsx` / `[id]/page.tsx`). **Do not** use parallel route slots (`@list` / `@detail`) in v1.

**Rationale:** Parallel routes add slot wiring, soft-navigation edge cases, and duplicate data-fetch coordination for modest gain. Nested layouts keep the list mounted when switching ids, URLs stay shareable (`/contacts/abc`), and implementation matches prior CRM split-shell learning without `?id=` query strings. Revisit parallel routes only if independent `loading.tsx` / `error.tsx` per pane becomes a measured need.

### Decision: UI stack (2026-06-12)

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

**Identity:** `login_name` is the setup login identifier. `login_email` stays null until linked from `party_email` (task 10+). **Display name** lives on `party` (1:1 via `employee.latch_user_id`) — not on `latch_users`. Sign-in accepts username or linked email (`resolveLatchUserId`).

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
- **`employee`** remains a master tag for internal staff; IAM login linkage stays on `employee.latch_user_id` until the [party identity slice](#decision-party-identity--party_user--user_class-deferred-2026-06-15) lands.

**Rationale:** Same site can host jobs with different customer/owner graphs (e.g. GC on one job, building owner direct on another). Master tags answer “who is this party to us generally?”; job relations answer “who plays which part on *this* engagement?”

### Decision: site vs location — separate entities (2026-06-15)

**Choice:** **`site`** = logical place (portfolio, campus, property, job site). **`location`** = normalized physical address / geocode record. Link via junction tables — **do not** embed address columns on `site`.

| Entity | Holds |
|--------|--------|
| `site` | `name`, optional `parent_site_id` (hierarchy) — no inline `notes` ([shared notes](#decision-notes-and-attachments-shared-tables-deferred-2026-06-15)) |
| `location` | Address lines, `city`, `state`, `postal_code`, `country`, optional `lat`/`lng`, `label` — manual entry in v1 |

**Rationale:** One address row can attach to a site, a party, and (later) a job work area without duplication. Site hierarchy supports portfolio → building → wing without conflating “where on the map” with “what we call this place in the business.”

### Decision: location attachments (2026-06-15)

**Choice:** `location` is shared; context is on junction rows with a **`purpose`** column — the **role of that address in this link**, not a description of the place (use `location.label` for “Suite 1200”, “Loading dock B”, etc.).

| Junction | Slice | When to use |
|----------|-------|-------------|
| `site_location` | **2** (task 17) | Which address(es) apply to this site |
| `party_location` | **2** (task 17) | Billing / HQ / mailing for this party |
| `job_location` | **5** (job slice) | Work area for this job |

Same `location` id may appear on multiple junctions.

#### `purpose` — examples

**`site_location`** — one site, multiple addresses or roles:

| `purpose` | Example |
|-----------|---------|
| `primary` | 200 Market St — main property address on the deed |
| `service_entrance` | Alley loading door — where techs park and enter |
| `loading_dock` | Dock 3, rear of building — deliveries |
| `other` | Guard shack entrance; overflow parking lot address |

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

**Concrete combo:** Location row `id=L1` = “200 Market St, San Francisco”. `site_location (site=Tower, L1, primary)`. Same `L1` also `party_location (party=Tower REIT, L1, hq)`. Job later: `job_location (job=Phase-2, L1, floor)` with `location.label` = “Floors 3–5” or a separate location row for a suite.

**Rationale:** Full attachment model is locked up front; Slice 2 ships site + party junctions. `job_location` DDL waits for the `job` anchor table in the job slice but uses the same `location` shape — no redesign later.

### Decision: address verification — deferred (2026-06-15)

**Choice:** **Defer** third-party address verification and autocomplete (type-ahead) to a later slice. Slice 2 `location` DDL is **manual entry** — address lines, city, state, postal code, country, optional `lat`/`lng`. No verification provider columns, no geocoder integration, in task 17.

**Rationale:** Primary payoff of verification APIs is **type-ahead UX** at data entry time; that belongs with `site_detail` / `contact_detail` UI work, not bare DDL. Add `verified_at` / provider metadata when a vendor is chosen.

### Decision: site contacts — `site_contact_relation` catalog (2026-06-15)

**Choice:**

- **`site_contact_relation`** — catalog table (`id`, `display_name`, `sort_order`; optional stable `code` for fixtures). Seeded defaults in DDL migration only if discussed ([seeding rule](#decision-business-data-seeding-2026-06-15)); otherwise empty catalog + app admin later.
- **`site_contact`:** `site_id` + `party_id` + `relation_id` FK → `site_contact_relation`. Standing people/orgs at a property. **Not** a substitute for `job_party`.
- **No inline `notes`** on `site_contact` — use [shared notes](#decision-notes-and-attachments-shared-tables-deferred-2026-06-15) when that slice lands.

Default relation rows to plan for (display names): Property owner, Property manager, Site superintendent, Billing contact, Other.

**Rationale:** Relation labels will grow; a catalog avoids repeated CHECK migrations. Job-scoped relations (`job_party`) may get a parallel catalog in the job slice.

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

**Rationale:** Notes and files are cross-cutting; one pattern beats scattered text columns.

### Decision: site contacts and systems (2026-06-15) — **superseded**

**Superseded by** [site contacts — `site_contact_relation` catalog](#decision-site-contacts--site_contact_relation-catalog-2026-06-15) and [installed systems — deferred](#decision-installed-systems--deferred-to-catalog-slice-2026-06-15) above.

### Decision: job anchor and stakeholders — deferred to job slice (2026-06-15)

**Choice:** `job` (and `job_party`, `job_location`, estimates, lines) are **out of Slice 2**. Locked contract for Slice 5:

- `job.site_id` NOT NULL → where work happens
- `job_party (job_id, party_id, relation)` — relations include at least: `customer`, `property_owner`, `bill_to`, `sold_to`, `general_contractor`, `subcontractor`, `subcontract_through`
- No `customer_id` column on `site` or `job` as the sole counterparty link

**Rationale:** Site slice establishes place + standing contacts; job slice adds engagement-specific stakeholder flexibility without painting Slice 2 into a single-FK corner.

### Decision: party identity — `party_user` + `user_class` (deferred) (2026-06-15)

**Choice:** **Deferred** to a future SubHub slice (and matching `@latch/*` platform work). Document now; do **not** implement in Slice 2.

| Piece | Intent |
|-------|--------|
| `party_user` | Generalize `latch_users` ↔ `party` beyond `employee.latch_user_id` (customer portal persons need login too) |
| `latch_users.user_class` | `internal` \| `external` — separates staff auth plane from customer/partner portal principals |
| Portal app roles + row scope | External users see only data tied to their party / `job_party` rows |

Until then: staff login via `employee.latch_user_id`; customer portal and external row scope are out of scope.

**Rationale:** Identity generalization is platform-shaped (principal kind, scoped manifests). Slice 2 proceeds on sites/locations without blocking on Latch policy changes.

### Decision: business data seeding (2026-06-15)

**Choice:**

1. **Do not add business seed migrations** (`*_dev_seed.sql`, fixture `INSERT`s in DDL tasks) **without prior discussion** — default for new slices is **DDL only**.
2. When seeding **is** approved: let Postgres assign ids (`DEFAULT gen_random_uuid()::text` or `INSERT … RETURNING id`); **do not** hard-code string ids like `seed-party-acme` in new seeds.
3. **`/setup`** (first admin user) is not business seeding — it stays the only runtime identity bootstrap.

**Rationale:** Fixed seed ids leak into docs, tests, and manual QA paths and fight the repo’s normal id convention. Seeds are a product choice (what demo data exists), not an automatic deliverable per migration task. Historical seeds (e.g. `017_party_dev_seed.sql`) predate this rule; do not extend that pattern without explicit approval.
