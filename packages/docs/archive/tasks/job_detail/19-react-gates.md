# 19 — `@latch/react` UI gates

## Goal

`CapabilitiesProvider`, `<Can>`, `<FieldControl>` — render from manifest only.

## Prerequisites

[18-approval-minimal.md](./18-approval-minimal.md) complete.

## Files

| File | Action |
|------|--------|
| `packages/react/src/capabilities.tsx` | Provider + components |
| `packages/react/src/index.ts` | Exports |
| `apps/web/src/app/jobs/[id]/page.tsx` | Use components |

## Steps

1. Read [`../../architecture/permissions-and-ui-sync.md`](../../../reference/permissions-and-ui-sync.md).
2. `"use client"` only in react package; page stays Server Component wrapping provider.
3. `FieldControl`: return `null` when no `read` on Field.
4. ESLint: `@latch/react` must not import server packages.

## Verify (stop gate)

- [ ] Financial block not in DOM for tech (view source)
- [ ] `npm run build` succeeds
- [ ] `STATUS.md` → **20-e2e-job-detail.md**

## Out of scope

Design system polish.
