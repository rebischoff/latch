# 12 — Contact DAL and API

> **Status:** Complete (2026-06-13). Next: [13-contact-ui.md](./13-contact-ui.md).

## Goal

Hand-written repository for multi-table contacts; explicit `/api/contacts` routes.

## Prerequisites

[11-contact-surfaces.md](./11-contact-surfaces.md) complete.

## Files

| File | Action |
|------|--------|
| `lib/contacts/repository.ts` | **Create** — party + joins |
| `lib/contacts/descriptors.ts` | **Create** |
| `lib/contacts/dal.ts` | **Create** |
| `app/api/contacts/route.ts` | **Create** — `contact_list` |
| `app/api/contacts/[id]/route.ts` | **Create** — `contact_detail` |
| `app/api/customers/route.ts` | **Create** — filtered list |
| `app/api/vendors/route.ts` | **Create** |
| `app/api/manufacturers/route.ts` | **Create** |

## Steps

1. `list`: filter by `party_role` for subset routes.
2. `get`: project `profile`; omit `phones`/`emails` without read (task **14** may add projection).
3. `patch`: anchor fields only until task **14**.
4. `create`/`delete` if manifest actions include them.
5. Route handlers use `createSurfaceRouteHandlers` — **not** a generic `[surface]` route.

## Verify (stop gate)

- [x] `GET /api/contacts` returns rows + manifest for granted role
- [x] `GET /api/contacts/[id]` 404 when no grant
- [x] `GET /api/customers` returns only `customer`-tagged parties
- [x] Contract test: forbidden field omission
- [x] [`../../STATUS.md`](../../STATUS.md) → [13-contact-ui.md](./13-contact-ui.md)

## Out of scope

- Phones/emails patch (task **14**)
- Contact UI
