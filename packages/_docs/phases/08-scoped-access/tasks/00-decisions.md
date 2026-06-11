# 00 — Decisions gate (Phase 08)

> **Status:** Complete (2026-06-10). Next: [01-task-index.md](./01-task-index.md).

## Goal

Confirm no unplanned forks block scoped RLS work. **Docs only — no code in this file.**

## Checklist

- [x] Discussion 09 locked — bounded scope primitive, not ABAC/ReBAC
- [x] access-control.md seam table matches contracts (`RowScope`, `scopeIds`, `Principal.bindings`)
- [x] Phase A landed — migration `010_latch_scopes.sql` in spike; contracts src updated
- [x] Phase C proven — spike task 08 complete (delegation is app code, not `@latch/policy`)
- [x] Empty `scopeIds` default-closed — [decisions.md](../decisions.md)
- [x] Native RLS explicitly out — stays Phase 07 (DAL-only row filter in Phase 08)
- [x] Two-harness model — policy proof in `spike_policy`; task 04 consumer proof in `apps/spike_business` (not CRM) — [decisions.md](../decisions.md#decision-two-harness-proof-model--repoint-task-04-2026-06-10)

## Verify (stop gate)

- [x] All rows in [decisions.md](../decisions.md) reviewed; no open fork requires coding before task 02
- [x] Task chain 02→05 is executable without new Decision blocks
