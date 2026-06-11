# Threat model

Concrete threats the platform must defend against, mapped to the control that handles each. **Each row should have at least one automated test before v1 ships.**

## Scope

- In: data-access threats, authorization bypass, audit integrity.
- Out: network / infra threats (TLS, DDoS, secret leakage), browser-side vulnerabilities (XSS, CSRF ù handled by Next.js + standard practice), social engineering.

## Method

Lightweight STRIDE-style enumeration. Each row:

| Column | Meaning |
|---|---|
| **#** | Stable id (`T*`). Referenced from tests and docs. |
| **Threat** | Short name. |
| **Vector** | How an attacker would attempt this. |
| **Control** | Platform feature that prevents it. |
| **Test** | What "this is closed" looks like in CI. |

## Threats

| # | Threat | Vector | Control | Test |
|---|---|---|---|---|
| **T1** | Mass assignment | `PATCH /jobs/1 {hourly_rate: 0.01}` from a `field_tech` | Writable Zod `.strict()` derived from manifest; reject unknown / non-writable keys | Send extra key ? expect 400/403; assert no DB write |
| **T2** | Forbidden field read | `GET /jobs/1?fields=cost_of_work` or default response includes forbidden Field | DAL ignores client field hints; manifest is source of truth; DTO omits unread Fields | Snapshot DTO for two roles ? assert column sets differ correctly |
| **T3** | Stale manifest exploit | Tab open while admin revoked role; user submits form using permissions from a cached read | Read path may cache manifests (`manifestCacheMode`); **mutations always bypass** the read cache and call `PolicyService.resolve` fresh (`resolveContextFresh` / `bypassCache`, global `stalePolicyOnWrite: recheck`). Cache keys include `policyVersion`; IAM bumps invalidate TTL/request entries for the old generation. | `tests/threat.test.ts` ó accept/reject/withdraw without grant ? 403; cached read + revoke/`policyVersion` bump + fresh resolve on write ? 403; duplicate reads hit cache before revoke. `packages/policy` ó `deleteByVersion` + version mismatch miss. |
| **T4** | 403 vs 404 side-channel | Probing existence of records via response-code differences | Global option `forbiddenFieldResponse: 404` for sensitive Surfaces; consistent semantics | Test response codes match config for each Surface |
| **T5** | RLS bypass via privileged DB role | Code path runs as superuser or `SECURITY DEFINER` function | App connects with non-superuser `latch_app` role; CI asserts no superuser at runtime | `tests/threat.test.ts` ó `SELECT current_user` = `latch_app`; `pg_roles.rolsuper` = false when `LATCH_APP_DATABASE_URL` set |
| **T6** | Audit tampering | App code or migration deletes/updates audit rows | Audit table owned by separate role; app role has `INSERT` only; `UPDATE/DELETE` revoked | Attempt `UPDATE latch_audit` from app role ? expect permission error |
| **T7** | Pending change tampering | Submitter mutates own pending after decision; reviewer flips decision | Pending row immutable post-decision; state machine enforced in DAL | `tests/threat.test.ts` ù post-accept accept/reject/withdraw ? NotFound |
| **T8** | Privilege escalation via role assignment | User self-assigns admin role through a writable Field | Role assignment is its own Surface (`user_roles_detail`) with its own policy; default deny for non-admins | `field_tech` tries to grant admin ? 403 + audit deny row |
| **T9** | Cross-company data leak *(future, multi-co)* | Connection pool reuse delivers wrong company's data | Per-request DB client; `SET LOCAL` company assertion at transaction start; RLS check on every row *(future)* | Pool stress test asserts no cross-company rows leak |
| **T10** | Approval bypass via direct DAL | A new code path writes a Field that should require approval | DAL refuses write to Fields marked `requires_approval` unless context flag set by approval applier | `tests/threat.test.ts` ù submit-only ? pending only; no pending store ? 403 |
| **T11** | Codegen drift | Generated file hand-edited or out of sync with YAML | `codegen --check` in CI; generated files marked `// DO NOT EDIT`; lint rule blocks edits | CI fails when YAML and generated file diverge |
| **T12** | Session var leak across requests | `SET LOCAL` forgotten; previous request's actor/company carries over | Every DB call wrapped in transaction that begins with `SET LOCAL`; middleware asserts | `tests/threat.test.ts` ó rapid alternation of two principals on pooled PG connection ? `current_setting('app.principal_id')` matches each actor; audit `actor_id` and pending `submitted_by` correct per row |
| **T13** | Field reference forgery | UI / API caller sends `field_id` that doesn't exist on the Surface | Manifest enumerates all known Field IDs; unknown IDs in request rejected | Test sending unknown `field_id` ? 400 |
| **T14** | Over-broad manifest exfiltration | Server returns full app manifest including Surfaces user shouldn't know exist | `navManifestScope: minimal` default; response shape snapshot-tested | Snapshot manifest per role; assert no leakage of unauthorized Surface IDs |
| **T15** | Bulk operation partial-corruption | One mid-batch row fails after others applied with no rollback / no report | Bulk DAL evaluates permission per row up front; applies in transaction; returns per-row result | Bulk test with mixed permitted/forbidden rows ? all-or-none or partial-success per spec |
| **T16** | Audit gap on delete / restore | Delete path skips `writeAudit` | DAL `delete` always writes audit `before` snapshot in same flow | Delete then query audit ù row present |
| **T17** | Denied requests not logged | Authorization failure leaves no trace; brute-force attempts invisible | Optional `auditDeniedAccess` global option; recommended `true` for sensitive Surfaces | Trigger 5 denied reads ? 5 audit deny rows |

## Priority for v1

Minimum tests in CI before v1 ships: **T1, T2, T3, T5, T6, T11, T13, T15.**

The rest should be implemented (the control), even if the test is deferred.

## Process

- New Surface or new Field group ? review this table; add new threats if the addition introduces a category not covered.
- New control ? cross-link from the control's design doc back to the threat id (e.g. `// covers T1`).
- Every quarter: re-read this doc; confirm tests still exist and still pass.

## Related

- [`architecture/access-control.md`](../reference/access-control.md)
- [`architecture/permissions-and-ui-sync.md`](../reference/permissions-and-ui-sync.md)
- [`architecture/audit-and-lifecycle.md`](../reference/audit-and-lifecycle.md)
- [`architecture/bulk-operations.md`](../reference/bulk-operations.md)
