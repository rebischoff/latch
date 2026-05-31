# Use cases ù service-trades vertical

The platform itself is generic. The **pilot** is a service-trades business app suite (construction, electrical, HVAC, plumbing). This doc grounds the abstractions in concrete scenarios so design choices have something to push against.

## Why this vertical

- Naturally exercises **field-level permissions** (techs see job details but not financials).
- Naturally exercises **row-level permissions** (techs see only their assigned jobs).
- Naturally exercises **Surfaces that span many tables** (a Job ? customer + site + scope + line items + assignments + attachments).
- Naturally exercises **approval** (change orders, refunds, schedule changes above a threshold).
- Naturally exercises **audit** (insurance / regulatory disputes).
- Naturally exercises **bulk operations** (re-assign 20 jobs to a different tech, delete cancelled jobs in a batch).

## Personas

| Persona | Role(s) | Key needs |
|---|---|---|
| **Field Tech** | `field_tech` | See own jobs, log time, attach photos, mark work complete. Must not see pricing/financials. |
| **Office Admin** | `office_admin` | Create/edit jobs, assign techs, manage customers, see pricing, run reports. |
| **Project Manager** | `project_manager` | Everything Office Admin can do + approve change orders + reassign across teams. |
| **Owner / Accountant** | `accountant` | See all financials, exports, audit log. Often read-only on operational data. |
| **Platform Admin** | `platform_admin` | Manage roles, seed data, troubleshoot. Always has full audit visibility. |

## Surfaces planned for the sample app

| Surface | Mode | Spans (tables) | Why it's interesting |
|---|---|---|---|
| `job_detail` ? pilot | detail | `jobs`, `customers`, `sites`, `job_lines`, `assignments`, `attachments` | Multi-table; Field-level (financials hidden from tech); row-level (own jobs); approval (change orders); audit; hard delete |
| `job_list` | list | `jobs` + display joins | Search/filter; row-level; bulk update (assign tech, change status); bulk delete |
| `customer_detail` | detail | `customers`, `sites`, `job_history` (view) | Cross-Surface link from job; nested data |

Deferred (v1.1+): `estimate_detail`, `invoice_detail`, `time_entry_list`, `schedule_board`, `inventory_*`.

## Scenarios (concrete walks)

### S1 ù Field Tech opens a job

1. Tech logs in ? manifest resolved for nav: `[jobs]` only.
2. Opens `/jobs` (`job_list`) ? manifest restricts rows to `assignments.user_id = me`; columns: id, customer name, site, status, scheduled_at. **No** financials.
3. Opens `/jobs/<id>` (`job_detail`) ? server re-resolves manifest. DAL projects only Field-permitted columns: `summary`, `scope`, `assignments`, `attachments`, `time_entries`. `financials` Field omitted from DTO entirely.
4. Tech adds a time entry ? Server Action ? re-authorize ? DAL insert ? audit row written.
5. Tech tries (via crafted PATCH) to set `job.invoice_amount = 1` ? Zod `.strict()` rejects unknown key; 400. Audit row written for denied attempt (optional).

### S2 ù Office Admin reassigns 20 jobs (bulk)

1. Admin selects 20 jobs from `job_list`.
2. Clicks "Reassign to tech X".
3. Bulk action route handler called with `{ ids: [...], patch: { assigned_to: "X" } }`.
4. Server re-resolves manifest. DAL evaluates `write` on `assignment` Field **per row**. Rows the admin can't touch are reported back as failures (no partial corruption). See [`bulk-operations.md`](../reference/bulk-operations.md).
5. Each successful row produces an audit entry. Batch metadata links them via `request_id`.

### S3 ù PM approves a change order

1. Tech submits a change-order pending change on `job_detail` (raises `job.contract_amount`).
2. Pending row stored in `latch_pending_changes` with `status = submitted`.
3. PM opens job ? manifest shows `approve` action on `financial_terms` Field ? UI surfaces "Pending change" banner with diff.
4. PM clicks Accept ? API re-authorizes ? transaction: apply patch to `jobs` row ? audit row (`action = approve`, `approval_id = ...`) ? pending row marked accepted.
5. Tech sees updated job on next load.

### S4 ù Field Tech tries to access another tech's job

1. Tech crafts `GET /api/jobs/<other-job-id>`.
2. Route handler resolves manifest for `job_detail` scope.
3. DAL applies row filter `assignments.user_id = me`.
4. Row not in result set ? 404 (existence hiding) per global option.
5. Audit row written (denied read, optional but recommended for security-sensitive Surfaces).

### S5 ù Accountant exports financials

1. Accountant opens `/reports/financials`.
2. Route handler ù not a Server Action, because we want CSV streaming + future external access.
3. DAL queries with `read` on `financials` Field; row scope is "all".
4. CSV streamed. Audit row written (export action, row count).

## What these scenarios force the design to handle

| Requirement | Forced by |
|---|---|
| Per-row permission evaluation in bulk | S2 |
| DTO must omit, not zero-out, forbidden Fields | S1 |
| Audit on denied reads (configurable) | S4 |
| Server Action vs route handler split | S5 vs S3 |
| Approval state machine + audit linkage | S3 |
| Strict write rejection | S1 |
| Pending changes don't touch live row | S3 |

## Out of scope (sample app)

- Scheduling/dispatch UI (calendar, drag-drop, route optimization).
- Customer portal / external sign-off (requires external reviewers ù deferred).
- Mobile app (web-responsive is enough for v1).
- Payments / accounting integrations.
- Estimation / quoting (deferred to v1.1).

## Related

- [`scope.md`](./scope.md)
- [`architecture/bulk-operations.md`](../reference/bulk-operations.md)
- [`architecture/access-control.md`](../reference/access-control.md)
