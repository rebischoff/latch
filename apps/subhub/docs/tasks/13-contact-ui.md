# 13 — Contact UI

> **Status:** Complete (2026-06-13). Next: [14-contact-child-collections.md](./14-contact-child-collections.md).

## Goal

`/contacts` master-detail: list in layout, detail at `/contacts/[id]`.

## Prerequisites

[12-contact-dal-api.md](./12-contact-dal-api.md) complete.

## Files

| File | Action |
|------|--------|
| `app/(app)/contacts/layout.tsx` | **Create** — nested master-detail |
| `app/(app)/contacts/page.tsx` | **Create** |
| `app/(app)/contacts/[id]/page.tsx` | **Create** |
| `components/contacts/ContactList.tsx` | **Create** |
| `components/contacts/ContactDetailForm.tsx` | **Create** — profile fields first |
| `components/shell/SurfaceToolbar.tsx` | **Reuse** — from task **08**; add surface-specific actions |

## Steps

1. **No parallel routes** — list lives in `layout.tsx` ([decisions.md](../decisions/README.md)).
2. Row click → `router.push(/contacts/${id})`.
3. React Query: `useSurfaceList('contact_list')`, `useSurfaceDetail('contact_detail', id)`.
4. **`SurfaceToolbar`:** New / Delete / Save from manifest; reuse component from task **08** ([routing-and-libraries.md](../routing-and-libraries.md#surface-toolbar)).
5. Form grid: multi-column on `lg` breakpoints via Ant `Row`/`Col` or CSS grid.
6. Optional: `/customers` reuses list component with different query hook + surface id.

## Verify (stop gate)

- [x] List loads; clicking row shows detail without full page remount of list
- [x] Save PATCH updates profile; manifest returned on response
- [x] User without grant gets 404 / `notFound()`
- [x] [`../../STATUS.md`](../../STATUS.md) → [14-contact-child-collections.md](./14-contact-child-collections.md)

## Out of scope

- Phone/email arrays (task **14**)

## Reference

- [routing-and-libraries.md](../routing-and-libraries.md)
