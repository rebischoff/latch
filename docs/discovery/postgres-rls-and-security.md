# Discovery: PostgreSQL RLS and security

> **Status (2026-05-27): DEFERRED post-v1.** v1 enforcement is **DAL-only**. See [`../scope.md`](../foundations/scope.md). This doc remains the design target for the Phase 4 hardening spike ù do not implement in v1.

Evaluate whether the platform should layer Postgres-native enforcement (RLS, column privileges, views) underneath the DAL as a safety net.

## Questions to answer (Phase 4)

1. Can RLS + session variables cover company + row ownership cleanly?
2. Can **Field-level** read masking be done with views per role, or does role cardinality explode?
3. How do **pending/approval** rows interact with RLS (reviewers see pending; others do not)?
4. What is the DX for migrations when RLS policies are metadata-driven?
5. Performance under realistic policy counts?
6. What proves "the app is not connected as superuser" at runtime?

## Postgres features to prototype

| Feature | Notes |
|---|---|
| [Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) | `ENABLE ROW LEVEL SECURITY`, policies per command |
| `current_setting('app.*', true)` | Bind principal/company from Next.js per request/transaction |
| [SECURITY BARRIER views](https://www.postgresql.org/docs/current/rules-privileges.html) | Prevent optimizer bypass on security views |
| Column privileges | `GRANT SELECT (col) ON ...` ù static, poor fit for dynamic Field sets |

## Spike plan (Phase 4 ù post-v1)

1. **Spike A ù Company/row RLS:** policy keyed on `app.principal_id` / `app.company_id`.
2. **Spike B ù Field mask view:** base table + view exposing subset of columns; role connects to view only.
3. **Spike C ù Audit trigger hardening:** trigger writes to audit table as a role that can only INSERT.
4. **Spike D ù Pending table RLS:** submitter vs reviewer policies.

Document results below under **Findings**.

## Findings

_Empty until spikes run (post-v1)._

| Spike | Result | Recommendation |
|---|---|---|
| A | | |
| B | | |
| C | | |
| D | | |

## Hypothesis (current)

- **RLS for row/company:** valuable as safety net.
- **Field-level:** keep app-layer (DAL); avoid thousands of static GRANTs.
- **Approval:** separate pending tables with their own RLS; not mixed into live tables.

## Alternatives considered

- TypeScript-only policy engine (current v1 choice).
- OPA / Cedar for policy DSL ù too heavy for our use case.
- Supabase / PostgREST patterns ù reference only; opposite architectural direction.

## References

- PostgreSQL docs: RLS, triggers, `SECURITY INVOKER` vs `DEFINER` views
- OWASP: indirect object references / mass assignment (Field abstraction helps)
- Cross-link: [`../threat-model.md`](../foundations/threat-model.md) T5, T6, T9, T12.
