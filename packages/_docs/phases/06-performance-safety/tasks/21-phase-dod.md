# 21 — Phase 06 definition of done

> **Status:** Complete (2026-06-03). Phase 06 closed; root STATUS → Phase 07 (deferred).

## Goal

Close Phase 06: README verify checklist, discovery doc complete, threat recap, repoint root [`STATUS.md`](../../../../../STATUS.md) to Phase 07 (or next active phase).

## Prerequisites

- [20-e2e-performance-safety.md](./20-e2e-performance-safety.md) complete.
- Cache track **04–09** complete.
- Safety track **10** (T5), **11** (T12 control) complete.
- RLS deferral recorded (task **00** §6 + [`../decisions.md`](../decisions.md) + discovery status line).

## Files

| File | Action |
|------|--------|
| [`../README.md`](../README.md) | All DoD `- [x]` |
| [`../STATUS.md`](../STATUS.md) | State: complete |
| [`../../../../STATUS.md`](../../../../../STATUS.md) | Active phase → Phase 07 (or note still deferred) |
| [`../../../discovery/postgres-rls-and-security.md`](../../../discovery/postgres-rls-and-security.md) | Status line: RLS spike/adoption retargeted to Phase 07 |
| [`../../07-scale-out/README.md`](../../07-scale-out/README.md) | Confirm RLS + audit-trigger + PG job-store rows present |

## Verify (stop gate)

- [x] `npm run test` / `npm run build` green
- [x] README DoD: cache mode, benchmark, T5/T12, RLS-deferred decision
- [x] [`../decisions.md`](../decisions.md) has no open **Open / to lock** items (RLS posture = deferred)
- [x] Root STATUS → [Phase 07](../../07-scale-out/STATUS.md) (Phase 07 deferred until driver)

## Out of scope

Phase 07 implementation (multi-company, RLS adoption, audit triggers, publish packages).
