# Bulk operations

How the DAL handles **bulk update** and **bulk delete** (hard delete in v1) under Field- and row-level permissions.

## Why this needs its own design

A naive `UPDATE jobs SET assigned_to = $1 WHERE id = ANY($2)` happily updates rows the user can't see. Every guarantee the single-record DAL gives us (Field-level write, row-level read, audit, approval) must hold per row when many are touched at once.

## Decision: per-row permission + partial-success default (2026-05-27)

**Choice:**

1. **Per-row permission evaluation** before applying any change. Rows the actor cannot write are excluded from the operation.
2. **Default mode: `partial`** � succeed on the writable rows, return a per-row result.
3. **Optional mode: `all_or_nothing`** � request flag; if any row is forbidden or fails validation, no rows change.
4. **Transactional within mode:** `partial` still runs in one transaction; "partial" means some rows are reported as skipped/failed, not "half-applied then crashed."
5. **Audit:** one audit row per *successfully changed* row, plus one optional batch summary row linked by `request_id`.

**Rationale:**

- Partial is what trades-CRM users actually want (S2 in [`../use-cases.md`](../foundations/use-cases.md)): "reassign these 20, tell me which I couldn't."
- All-or-nothing protects financial / regulated batches where atomicity matters.
- Per-row audit keeps the audit log queryable by entity; the batch row helps explain bursts.

## API shape

### REST (route handler, recommended)

```http
PATCH /api/jobs:bulk
Content-Type: application/json

{
  "ids": ["uuid-1", "uuid-2", "uuid-3"],
  "patch": { "assigned_to": "tech-x" },
  "mode": "partial"            // or "all_or_nothing"; default "partial"
}
```

Response:

```json
{
  "succeeded": ["uuid-1", "uuid-3"],
  "skipped": [
    { "id": "uuid-2", "reason": "forbidden_row" }
  ],
  "failed": []
}
```

Status codes:

- `200` for `partial` mode regardless of skipped/failed counts.
- `200` for `all_or_nothing` if everything applied.
- `409` for `all_or_nothing` if any row was forbidden / invalid (nothing applied; body details which).

### Bulk delete (HTTP)

```http
DELETE /api/jobs:bulk
{ "ids": [...], "mode": "partial" }
```

Same response shape.

### Bulk delete (Phase 01)

Task: [`11-dal-bulk-delete.md`](../phases/01-data-access/tasks/11-dal-bulk-delete.md). See [`../foundations/scope.md`](../foundations/scope.md).

## DAL contract

```ts
// Illustrative
interface BulkUpdateResult {
  succeeded: string[];
  skipped: Array<{ id: string; reason: "forbidden_row" | "forbidden_field" | "not_found" | "validation_error"; detail?: unknown }>;
  failed: Array<{ id: string; reason: "db_error"; detail?: unknown }>;
}

interface DalBulk<T> {
  bulkUpdate(
    ctx: PermissionContext,
    ids: string[],
    patch: Partial<T>,
    opts?: { mode?: "partial" | "all_or_nothing"; requiresApproval?: boolean }
  ): Promise<BulkUpdateResult>;
  bulkDelete(
    ctx: PermissionContext,
    ids: string[],
    opts?: { mode?: "partial" | "all_or_nothing" }
  ): Promise<BulkUpdateResult>;
}
```

### Decision: bulk skip reasons � existence-hiding (2026-05-29)

**Choice:** Rows not visible under the same row filter as single-record `get` are reported as `not_found` in `skipped`, not `forbidden_row`. Use `forbidden_field` when the row is visible but the patch touches a non-writable Field; use `forbidden_row` only when the row is visible but the Surface/row policy denies the action.

**Rationale:** Matches single-record existence-hiding (S4). Avoids leaking whether an id exists to callers without row access.

## Algorithm

1. **Validate the patch shape** with the writable Zod schema narrowed by manifest. Any unknown / non-writable key ? reject the whole call (`400`).
2. **Load candidate rows** with the same row filters the single-record DAL would apply. Rows not visible ? `not_found` in `skipped` (see Decision above). Visible rows failing Field/action checks ? `forbidden_field` / `forbidden_row`.
3. **Per-row write check:** for each candidate, ensure the actor has `write` on every Field in the patch *for that row* (row-scoped policies may exist).
4. **Branch on mode:**
   - `partial`: write only the qualifying rows.
   - `all_or_nothing`: if any row was filtered out at step 2 or 3, abort and report.
5. **Apply** in a single transaction:
   - Approval-gated patches: write to `<project>_pending_changes` instead of the live row; one pending per id, linked by `batch_id`.
   - Live writes: UPDATE with `WHERE id IN (...)`, narrowed to the qualifying set.
6. **Audit:** one row per changed entity (action `update` / `delete`), plus one optional `bulk_summary` row with `request_id`, counts, mode.

## Cap and pagination

- **Hard cap per request:** start at 500 ids; configurable via global option `bulkMaxBatch`. Larger jobs use a paginated background runner (out of v1).
- **Server-defined timeout:** if the DAL detects a slow batch (>N seconds), it aborts in `all_or_nothing` mode and returns a partial result with a `timeout` reason in `partial`.

## Approval semantics for bulk

| Case | Behavior |
|---|---|
| None of the patched Fields are approval-gated | Apply directly. |
| Some patched Fields are approval-gated | The whole patch goes to `pending` per row (you can't "half-approve" a row's patch in v1). |
| `all_or_nothing` + any row needs approval | Pending records created for the full batch; live rows untouched. Reviewer accepts/rejects per row. |

Reviewer-side UX (accept all / reject all on a batch) is deferred � v1 reviews per row.

## Failure modes the test suite must cover (links to threat ids)

- **T15** Partial corruption: prove `all_or_nothing` is truly atomic.
- **T2** Field exfiltration: bulk update with a forbidden Field in patch ? 400, no rows touched.
- **T3** Stale manifest: revoke role mid-batch ? next batch op fails authz cleanly.
- **T16** Soft-delete audit gap: bulk hard-delete N rows ? N audit rows present.
- **T13** Unknown field in patch ? rejected (existing single-record rule applies).

## Open questions

- [ ] Should `forbidden_row` distinguish from `not_found` in default config? (Trade-off: information leakage vs UX clarity.)
- [ ] Bulk insert � v1 or deferred? Lean **deferred**; single-record insert covers trades-CRM use cases.
- [ ] Async bulk for >500 ids � design as a separate doc when needed.

## Related

- [`../scope.md`](../foundations/scope.md)
- [`../threat-model.md`](../foundations/threat-model.md)
- [`api-style.md`](./api-style.md)
- [`audit-and-lifecycle.md`](./audit-and-lifecycle.md)
- [`approval-trails.md`](./approval-trails.md)
