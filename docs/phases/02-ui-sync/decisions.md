# Phase 02 — decisions

## Decided

| Date | Topic | Choice |
|------|-------|--------|
| 2026-05-27 | Manifest delivery | RSC props → `CapabilitiesProvider` when possible |
| 2026-05-27 | Nav scope | `navManifestScope: minimal` (only permitted routes) |
| 2026-06-01 | `<FieldControl>` no-`read` render | **`null` (omit section)** — never a disabled placeholder |
| 2026-06-01 | `customer_detail` role access | **`office_admin` only.** `field_tech` has **no** binding on the Surface |
| 2026-06-01 | Customer mutations this phase | **`get` + `patch` only.** Customer `delete` deferred (hard delete already proven on jobs) |
| 2026-06-01 | Tech → `customer_detail` API | **404 (hide)** via per-Surface `forbiddenFieldResponse: 404` |
| 2026-06-01 | `customer_list` Surface | **Out of v1.** CRM `/customers` reached via cross-link / URL `?id=` |
| 2026-06-01 | Cross-Surface link | New `customer_ref` Field on `job_detail` (id + name); link to `/customers?id=`; admin only |
| 2026-06-01 | Surface id | Keep stable id **`customer_detail`**; defer `job` (`job_list`/`job_detail`) merge |
| 2026-06-01 | Canonical proof app | **`apps/crm`**; thin `apps/web` API only if a package test needs a host |

## Decision: `customer_detail` Surface sketch (2026-06-01)

**Choice:** Smallest second Surface that re-exercises the full stack (policy → DAL projection → manifest → `@latch/react` → CRM) with an admin/tech contrast mirroring jobs + `financial_terms`.

**Tables**

| Table | Columns (pilot) |
|-------|-----------------|
| `customers` | `id`, `name`, `phone`, `billing_notes` |
| `sites` | `id`, `customer_id` → `customers.id`, `label` |
| `jobs` | add `customer_id` → `customers.id` (enables cross-link + `job_history`) |

**Fields** (4 — enough to prove omission + read-only + write + nested/related data)

| Field id | Maps to | Proves |
|----------|---------|--------|
| `profile` | `customers.name`, `customers.phone` | Normal `read`/`write` split |
| `billing` | `customers.billing_notes` (`sensitivity: high`) | Field omission for non-readers (same pattern as `financial_terms`) |
| `sites` | child `sites` rows (`label`) | Multi-table / nested projection |
| `job_history` | jobs for this `customer_id` (`id`, `title`, `status`) | Read-only related data; no `write` on this Field |

**Role matrix**

| | `field_tech` | `office_admin` |
|--|--------------|----------------|
| Surface `customer_detail` | **no policy binding** | `surfaceActions`: `read`, `write` |
| `profile` | — | `read`, `write` |
| `billing` | — | `read`, `write` |
| `sites` | — | `read`, `write` |
| `job_history` | — | `read` only |
| Row scope | n/a | `all` (pilot seed = 2 customers) |
| CRM "Customers" nav | hidden | shown |
| Cross-link from job | hidden | shown when `customer_ref` present |

**Rationale:** The pilot already proved `@latch/react`, row-scope, and Field omission for `field_tech` on jobs. The new package signal here is a **second** Surface end-to-end for admin, plus proving the same packages **deny** a no-grant principal on a different Surface (404 + no link + nav still `[jobs]` only, matching [`use-cases.md`](../../foundations/use-cases.md) S1).

## Decision: cross-Surface link job → customer (2026-06-01)

**Choice:**

- `jobs` gains `customer_id` (NOT NULL for seeded jobs).
- `job_detail` gains a `customer_ref` Field projecting `{ id, name }` (id for navigation, name for the link label). This **adds a Field to the locked pilot Surface** — `06`/`08` must re-run codegen and keep generated files in sync (invariant 8).
- Link target: `/customers?id=<id>` (same split-view pattern as jobs).
- Visibility: rendered only when `customer_ref` is in the job DTO **and** the principal has `read` on `customer_detail` (manifest / `<Can>`, never a raw `href`).
- Following the link re-resolves the `customer_detail` manifest server-side; a tech who forges the URL gets the 404 (hide) semantics above.

**Rationale:** [`access-control.md`](../../reference/access-control.md) requires cross-Surface access to be explicit by id; today `job_list` only exposes display strings (`customer_site`), not a stable key.

## Decision: no `customer_list`; CRM customers page shape (2026-06-01)

**Choice:** v1 keeps the three locked Surfaces ([`scope.md`](../../foundations/scope.md)); no `customer_list`. CRM `/customers` is a split shell whose **right** pane shows detail when `?id=` is set and whose **left** pane is an `Empty` state ("Open a customer from a job") until then. Seed customer ids are documented in task verify steps for manual paste.

**Rationale:** A full list Surface duplicates Phase 01 work (pagination, projection, bulk, threat extensions) for little new package signal. Cross-link is the primary discovery path. A **minimal** `profile`-only `customer_list` may be added later as an explicit stretch task if admin browse-without-a-job proves awkward in QA — it must not block the Phase 02 task chain.

**Nav resolution:** `PolicyService.resolve(principal, { surface: "customer_detail", mode: "detail" })`; show the Customers route when `manifest.actions.includes("read")`. Do **not** reuse the `mode: "list"` call shape used for jobs (that works only because `job_list` exists).

## Deferred (does not block 04–08)

- [ ] `job_history` data source — DB view vs DAL join query (lock in task **09** `09-dal-get.md` when written).
