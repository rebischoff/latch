# 00 — Lock SubHub planning decisions

> **Status:** Complete (2026-06-12). Next: [01-task-index.md](./01-task-index.md).

## Goal

Confirm planning decisions are recorded so implementation tasks do not re-debate routing, libraries, child collections, or domain shape. **Docs only.**

## Prerequisites

Planning session complete (2026-06-12).

## Files

| File | Action |
|------|--------|
| [`../decisions/README.md`](../decisions/README.md) | Decision blocks for party model, routes, UI stack, collections |
| [`../routing-and-libraries.md`](../routing-and-libraries.md) | Dynamic vs explicit routes; parallel routes; library practices |
| [`../child-collections.md`](../child-collections.md) | Related-record pattern |
| [`../architecture.md`](../architecture.md) | Data model + surface catalog |
| [`../../STATUS.md`](../../STATUS.md) | Points at task **02** |

## Decisions locked (see [`../decisions/README.md`](../decisions/README.md))

1. Party spine — `party` + `party_role` subsets.
2. No approval / verification workflow.
3. **Explicit page and API routes** — no `[surface]` catch-all.
4. **Master-detail via nested layout** — no parallel `@list` / `@detail` slots in v1.
5. Ant Design + RHF + TanStack Query; desktop-only.
6. Child collections as logical Fields with array PATCH (replace semantics).
7. Line-item snapshots on estimate → job → invoice.
8. SQL-first persistence; migrations `014+` for business DDL (`013` = platform identity guards).

## Verify (stop gate)

- [x] [`../decisions/README.md`](../decisions/README.md) has dated Decision blocks
- [x] Routing questions answered in [`../routing-and-libraries.md`](../routing-and-libraries.md)
- [x] Child collection plan in [`../child-collections.md`](../child-collections.md)
- [x] [`../../STATUS.md`](../../STATUS.md) **Right now** → [02-ui-dependencies.md](./02-ui-dependencies.md)
- [x] No application code from this task

## Out of scope

- Implementation (tasks **02**+)
