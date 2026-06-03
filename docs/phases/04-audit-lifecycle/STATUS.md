# STATUS — Phase 04 Audit & lifecycle

> Phase-local quarterback. Global pointer: [`../../../STATUS.md`](../../../STATUS.md).
> Updated: 2026-06-02.

- **Home package:** `@latch/audit`
- **State:** **complete (2026-06-02)** — append-only audit, T6 immutability (trigger + `latch_app` grants), hard delete + CASCADE snapshots, restore-from-audit operator, retention seam; T6 + T16 in CI.

## Right now — do this next

Phase closed. Global active phase: [**05 Verification**](../05-verification/STATUS.md).

## Blockers

- None.

## Recently completed

- **2026-06-02:** Task **21** — Phase DoD recap: T6 (`tests/threat.test.ts` append-only API + app-role UPDATE rejected when `LATCH_APP_DATABASE_URL` set) + T16 (single/bulk delete audit); `npm run test` / `build` / `codegen:check` green; root STATUS → Phase 05.
- **2026-06-02:** Task **20** — `tests/restore.e2e.test.ts`: delete → audit (`assignments` in `before`) → `restoreFromAuditEntry`; list/get absent then restored; field_tech row-scope on restored job; CRM test-utils restore helpers.
- **2026-06-02:** Task **12** — **T16** delete audit tests: `tests/threat.test.ts` (single + bulk + negatives); strengthened `create-surface-dal.test.ts` bulk/forbidden/not_found audit coverage.
- **2026-06-02:** Task **08** — `@latch/audit` `AuditConfig` / `getAuditConfig()` (default **3** years); partition DDL sketch + operator archive runbook in reference + `DATABASE.md`; no partition automation in CI.
- **2026-06-02:** Task **07** — `restoreFromAuditEntry` in `@latch/audit`; `ConflictError` (409); CRM `replay` + `npm run restore-audit`; delete snapshot includes `customer_id`; restore tests (package + CRM).
- **2026-06-02:** Task **06** — `deleteAuditSnapshot(row, related)` on descriptor; DAL embeds CASCADE children when `restore` granted; jobs `assignments` + customer `sites` helpers; dal + CRM delete tests.
- **2026-06-02:** Task **05** — per-Surface cascade docs in [`audit-and-lifecycle.md`](../../reference/audit-and-lifecycle.md), [`DATABASE.md`](../../../apps/crm/docs/DATABASE.md); RESTRICT on `jobs.customer_id`; cross-links to tasks **06–07**.
- **2026-06-02:** Task **04** — `latch_app` migration **005** (`INSERT` only on `latch_audit`); T6 threat test as app role; CI Postgres + `LATCH_APP_DATABASE_URL`; [`DATABASE.md`](../../../apps/crm/docs/DATABASE.md) app-role section.
- **2026-06-02:** Task **00** — locked cascade, delete snapshot contract, restore operator, T6 model, retention seam, business-trigger deferral, Phase 05 audit boundary ([`decisions.md`](./decisions.md), [`audit-and-lifecycle.md`](../../reference/audit-and-lifecycle.md)).
- **2026-05-30:** Hard-delete-only decision + doc sweep; pilot DAL `delete` (no `deleted_at`); audit action `delete`.
- `@latch/audit` writer + `latch_audit` table; BEFORE UPDATE/DELETE immutability trigger (T6 trigger layer).
- DAL `writeAudit` on the pilot mutation paths.
