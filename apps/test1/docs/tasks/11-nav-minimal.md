# 11 — Policy-driven nav

> **Status:** Planning stub — not scheduled. Expand when task **10** is complete.

## Goal

Wire [../LAYOUT.md](../LAYOUT.md) nav catalog: show `/contacts` (and later routes) only when principal has surface `read`.

## Delivers

- `NAV_CATALOG` entry for `contact` with `mode: list` resolve
- `PolicyService` in `nav.ts` uses same registry as `latch.ts`
- Click test: restricted role does not see Contacts in menu

## Reference

- [`apps/crm/src/lib/nav.ts`](../../../crm/src/lib/nav.ts)
- Phase 02 task 18 pattern in [`docs/phases/02-ui-sync/tasks/18-nav-minimal.md`](../../../../docs/phases/02-ui-sync/tasks/18-nav-minimal.md)

## Prerequisites

- Task **10** complete.
