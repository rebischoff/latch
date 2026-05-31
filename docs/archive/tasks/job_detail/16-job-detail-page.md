# 16 — Job detail page (RSC)

## Goal

`/jobs/[id]` Server Component: manifest via props, minimal Field display.

## Prerequisites

[15-stub-principal.md](./15-stub-principal.md) complete.

## Files

| File | Action |
|------|--------|
| `apps/web/src/app/jobs/[id]/page.tsx` | RSC page |
| `apps/web/src/app/page.tsx` | Links to seed job ids |

## Steps

1. `resolveContext` + `dal.get` in page (server).
2. Pass `manifest` to `CapabilitiesProvider` (task **19** may implement components).
3. Show 404 UI on `NotFoundError`.
4. Wire form to Server Action from task **14** inside `<Can field="summary" action="write">`.

## Verify (stop gate)

- [ ] `/jobs/{SEED_JOB_OWNED}` renders for tech without financial section
- [ ] Same URL as admin shows contract amount
- [ ] `/jobs/{SEED_JOB_OTHER}` → not found for tech
- [ ] `STATUS.md` → **17-audit-triggers.md**

## Out of scope

Styling polish, nav manifest.
