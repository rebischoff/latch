# Discussion 12 — Audit opinionation

> **Status:** Session **6** complete (2026-06-10). Next: session **7** — template delivery ([`07-template-scaffold.md`](./07-template-scaffold.md)).
>
> **Prerequisite:** Sessions 1–2 (charter + taxonomy). **Runtime behavior** stays canonical in [`audit-and-lifecycle.md`](../../audit/docs/audit-and-lifecycle.md). **Compartment primer:** [`05-audit.md`](./05-audit.md).

## Shared understanding

`@latch/audit` today is **generic at the code layer** (injectable `AuditWriter`, per-app `audit-db-writer.ts`, `permission-db` co-located) while docs/compartments already treat audit as **platform spine** (one `latch_audit` table, DAL-origin writes, immutability).

This discussion decides **what moves into the platform** vs what stays app-owned, using the [spine / adapters / skin](./11-spine-adapters-skin.md) lens.

## Spine vs adapter vs skin (`@latch/audit`)

| Piece | Layer | Notes |
|-------|-------|-------|
| Audit on mutations (mode-dependent) | Spine | Invariant 6 — see audit **mode** decision; `latch_audit` table always ships |
| `latch_audit` DDL + immutability trigger | Spine | Template migration |
| `latch_app` INSERT-only on `latch_audit` | Spine | T6 |
| `AuditEntryInput` / `AuditAction` types | Spine | Maps to table columns |
| `restoreFromAuditEntry` eligibility + auth | Spine | Requires `restore` on Surface |
| `replay()` — INSERT anchor + children, FK order | Skin | Per domain (`apps/*/lib/restore/`) |
| `deleteAuditSnapshot` richness | Spine rules, skin data | Surface-scoped `before` contract |
| `createPostgresAuditWriter` | Adapter | Should not be copy-pasted per app |
| `createMemoryAuditWriter` | Adapter (test) | Tests + local dev without DB |
| `setAuditWriter` bootstrap | Adapter wiring | `ensureAuditWriter` → template |
| `withPermissionDb` | Adapter | **Misplaced** in audit; extract to pg-session |
| Retention config seam (`getAuditConfig`) | Spine config | Default 3 years; no automation in v1 |

## Side discussion: IAM vs business audit

| Option | Pros | Cons |
|--------|------|------|
| **One table** (`latch_audit`, `entity_type` discriminates) | One immutability model, retention, operator tooling; IAM is “more Surfaces” | Harder to apply IAM-only retention/indexing later |
| **Split tables** | Compliance narrative separation | Two write paths, two restore stories, drift risk |

**Working default:** one stream unless compliance forces a split — if split, keep **identical row shape** and spine write API; partition or view only.

## Points to confirm

1. Production audit path is **Postgres INSERT** — not a generic pluggable writer as the primary design center. ✅ session 6.1 (2026-06-10)
2. Template ships **canonical `latch_audit` migration** — apps do not fork table shape. ✅ session 6.2 (2026-06-10)
3. IAM mutations (`latch_users`, `latch_roles`, assignments) use the **same** audit stream as business tables. ✅ session 6.3 (2026-06-10)
4. `restore` replay stays **app-supplied**; platform owns orchestration + authorization only. ✅ session 6.4 (2026-06-10)
5. Per-app `audit-db-writer.ts` is **temporary** — graduates to platform adapter + template wiring. ✅ session 6.5 (2026-06-10)

## Open questions (deferred to implementation)

- `latch_app_config` (or equivalent) migration for persisted `audit_mode` — session 7 / extraction.
- `setAuditWriter` wiring: `@latch/app-kit` / template `ensureAuditWriter()` at app bootstrap (not kernel lazy-init from `DATABASE_URL`).

### Decision: audit production path (2026-06-10)

**Choice:** **Postgres-first (A)** — v1 production path is `INSERT` into `latch_audit` via `@latch/adapter-pg-audit`. `@latch/audit` keeps `AuditWriter` injection + `createMemoryAuditWriter` for tests/local dev only; pluggable multi-backend audit is not the design center.

**Rationale:** Platform DDL and immutability are Postgres-specific; a generic writer-first model implies alternate stores Latch is not building for v1. Injection remains for compartment tests without weakening the Postgres production contract.

### Decision: canonical `latch_audit` DDL (2026-06-10)

**Choice:** One platform migration (`009_latch_audit.sql`); apps do not fork table shape, triggers, or immutability rules. Platform-wide changes (e.g. time partitioning) ship as template migration updates.

**Rationale:** Per-app audit DDL forks break operator tooling, restore, and adapter assumptions. Session 3 platform checklist treats audit DDL as identical spine for every app.

### Decision: IAM + business audit storage (2026-06-10)

**Choice:** **One `latch_audit` table** for IAM and business mutations (`entity_type` discriminates). Split only if compliance forces it — via partition/view, identical row shape, same spine write API (session 4.5).

**Rationale:** One immutability model, one adapter, one restore/operator story. IAM is permission-gated Surfaces, not a separate audit domain.

### Decision: restore replay ownership (2026-06-10)

**Choice:** **Option A** — `@latch/audit` owns `restoreFromAuditEntry` (auth, eligibility, conflict checks, restore audit row); each app supplies **`replay()`** to INSERT anchor + children from delete `before` JSON in FK-safe order. No generic platform replay in v1.

**Rationale:** FK graphs and embedded child shapes are domain-specific (`job_detail` vs `widgets`). Platform cannot know every business schema without duplicating the multi-table glue problem.

### Decision: retire per-app audit writer (2026-06-10)

**Choice:** Per-app `audit-db-writer.ts` is **temporary**. Production writer graduates to **`@latch/adapter-pg-audit`**; bootstrap via `@latch/app-kit` / template `ensureAuditWriter()`. Extraction slice #1 on session 9 roadmap.

**Rationale:** Copy-paste across `widgets`, `spike_policy`, template violates adapter rules; session 5 locked package home.

### Decision: `withPermissionDb` extraction (2026-06-10)

**Choice:** Extract from `@latch/audit` to **`@latch/pg-session`** (session 5.4). `@latch/audit` may re-export during deprecation.

**Rationale:** Session binding is shared infrastructure (audit, pending, IAM), not audit domain logic.

### Decision: audit mode at scaffold (2026-06-10)

**Choice:** Three **immutable-at-runtime** modes, chosen at **`latch new`** (default **`full`**), stored in platform config (e.g. `latch_app_config.audit_mode` — migration TBD):

| Mode | Create (`insert`) | Update (`update`) | Delete (`delete`) |
|------|-------------------|-------------------|-------------------|
| **`full`** | `after` snapshot | before/after + patch | `before` (restore-capable when granted) |
| **`standard`** | **metadata only** (actor, time, entity ids — no `after` body) | before/after + patch | `before` (restore-capable when granted) |
| **`recovery`** | none | none | `before` (restore-capable when granted) |

`latch_audit` migration ships for **every** Latch app; mode controls **what the DAL writes**, not whether the table exists. Approve/reject/bulk_summary follow the same mode rules as their underlying mutation class.

**Rationale:** Creates duplicate live-row data in `full` mode; `standard` logs provenance without payload bloat. `recovery` supports hard-delete undo with minimal audit footprint. Aligns with tiered delete snapshots already in Phase 04.

### Decision: audit mode change policy (2026-06-10)

**Choice:** **Upgrade-only** via **operator migration or CLI** (`recovery` → `standard` → `full`). **No** runtime UI toggle. **Downgrade** only via explicit break-glass operator script (documented, out of band). Mode changes do not backfill or purge historical rows — trail may be discontinuous (document in runbook).

**Rationale:** Business requirements can tighten over time; silent downgrade is a compliance risk. Immutable-at-runtime prevents mid-request bypass; controlled upgrade path avoids re-scaffolding.

## Verify (stop gate)

- [x] Spine vs adapter table agreed and recorded as Decision blocks above
- [x] IAM vs business audit storage decided
- [x] Extraction items added to roadmap session 9 sequence (audit adapter + `audit_mode` config)
- [x] [`05-audit.md`](./05-audit.md) open questions updated or superseded

## Related

- [`10-opinionation-roadmap.md`](./10-opinionation-roadmap.md) · [`11-spine-adapters-skin.md`](./11-spine-adapters-skin.md)
- [`../../audit/docs/audit-and-lifecycle.md`](../../audit/docs/audit-and-lifecycle.md) · [`../phases/04-audit-lifecycle/decisions.md`](../phases/04-audit-lifecycle/decisions.md)
- [`../../audit/src/audit-service.ts`](../../audit/src/audit-service.ts) · [`../../../apps/widgets/lib/audit-bootstrap.ts`](../../../apps/widgets/lib/audit-bootstrap.ts)
