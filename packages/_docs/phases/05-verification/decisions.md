# Phase 05 — decisions

## Decided

| Date | Topic | Choice |
|------|-------|--------|
| 2026-05-27 | Granularity (v1) | All-or-nothing per pending record |
| 2026-05-27 | Reviewer scope (v1) | Internal only; external sign-off deferred |
| 2026-05-27 | After reject | New pending on resubmit; trail links versions (`supersedes_id`) |
| 2026-06-02 | Reviewer UX | Minimal **`job_detail`** UI + HTTP APIs + tests (no global inbox) |
| 2026-06-02 | Withdraw | Submitter may **withdraw** while `submitted` |
| 2026-06-02 | Reject audit | **Always** `writeAudit({ action: 'reject' })` |
| 2026-06-02 | Pending visibility | **Role-split** — submitter sees own proposal; reviewers see accept/reject payload; others see live only |
| 2026-06-02 | Gating source | **Hybrid (C)** — YAML `requires_verification` + runtime `submit` ∧ ¬`write` |
| 2026-06-02 | Gate scope | **Field-level only** (split patch) |
| 2026-06-02 | Open pending concurrency | **One** `submitted` per `(surface_id, entity_id)`; duplicate submit → **409** |
| 2026-06-02 | Bulk gated patches | **In DoD** — per-row pending + `batch_id` |
| 2026-06-03 | Bulk pending policy (task 09) | **A** — `field_tech` `submit` on `financial_terms` at `job_list` |
| 2026-06-02 | Pending immutability (T7) | **DAL-only** in v1 |
| 2026-06-02 | Reject comment | **Optional** |
| 2026-06-02 | Codegen | `requires_verification` on Field in `*.surface.yaml` |
| 2026-06-02 | Phase 06 boundary | No manifest cache or RLS in Phase 05 |
| 2026-06-02 | Storage | **`latch_pending_changes`** table (option B); `surface_id` not `module_id` |

## Open / to lock

_None — locked in task **00** (2026-06-02)._

### Decision: verification gating — hybrid YAML + manifest (2026-06-02)

**Choice:** Surface YAML marks which Fields **may** use verification (`requires_verification: true`). Codegen emits a stable Field-id set. At request time, the DAL routes those Fields to pending when the resolved manifest grants **`submit`** and not **`write`** on that Field; otherwise direct write (if `write`) or forbid.

**Rationale:** Same Field, different roles (field_tech submit vs office_admin write) is the pilot story; YAML-only gating cannot express role-specific paths. YAML still gives T10/codegen a single structural source and PR-reviewable intent.

**Canonical detail:** [`tasks/00-decisions.md`](./tasks/00-decisions.md) §4.

### Decision: pending storage schema (2026-06-02)

**Choice:** Table **`latch_pending_changes`** with columns: `id`, `surface_id`, `entity_id`, `field_ids`, `patch`, `status` (`submitted` \| `accepted` \| `rejected` \| `withdrawn`), `submitted_by`, `submitted_at`, `decided_by`, `decided_at`, `comment`, `batch_id`, `supersedes_id`.

**Rationale:** Survives restart and multi-instance CRM; aligns with audit `approval_id`; supports bulk and resubmit trail.

**Canonical detail:** [`tasks/00-decisions.md`](./tasks/00-decisions.md) §2 · [`../../reference/approval-trails.md`](../../../approval/docs/approval-trails.md).

### Decision: submitter edit and expiry (2026-06-02)

**Choice:** v1 — **no edit** of pending rows. Submitter **withdraws** or waits for reject/accept. **No** auto-expiry / auto-reject in Phase 05.

**Rationale:** Withdraw covers “I submitted wrong amount”; edit would need PATCH pending API and T7 edge cases.

### Decision: Phase 05 vs Phase 06 (2026-06-02)

**Choice:** Phase 05 does **not** implement `manifestCacheMode`, RLS gates, or business-table audit triggers. Writes always re-resolve policy (T3).

**Rationale:** Keeps failure domains separate; Phase 06 owns cache + RLS spike.
