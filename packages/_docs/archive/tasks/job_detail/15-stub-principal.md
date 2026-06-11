# 15 — Stub principal (D2)

## Goal

Implement `getPrincipal()` for Step 3 without a real IdP.

## Prerequisites

[14-server-action.md](./14-server-action.md) complete.

## Strategy (documented in task 00)

Step 3 does **not** choose an IdP. Task **15** implements `getPrincipal()` from env vars; provider choice stays open as **D2** in [`open-questions.md`](../../../foundations/open-questions.md).

| Env var | Purpose | Default |
|---------|---------|---------|
| `LATCH_STUB_USER` | `Principal.id` | `SEED_TECH_ID` from `packages/dal/src/seed.ts` |
| `LATCH_STUB_ROLE` | Single role passed to `PolicyService` | `field_tech` |

**Seed roles (pilot):**

| Role id | Seed constant | Manual checks |
|---------|---------------|---------------|
| `field_tech` | `SEED_TECH_ID` | S1, S4 — financial Fields omitted; own-job row rules |
| `office_admin` | `SEED_ADMIN_ID` | S3 — financial Fields readable; PM approval paths |

Switch role locally: `LATCH_STUB_ROLE=office_admin npm run dev` (document on home page or README in task 15).

**Not in this task:** `apps/web/src/lib/auth/getPrincipal.ts` — create in task 15 only.

## Files

| File | Action |
|------|--------|
| `apps/web/src/lib/auth/getPrincipal.ts` | **Create** |
| `apps/web/src/lib/latch.ts` | Use `getPrincipal()` in `resolveContext` |

## Steps

1. Return `Principal` `{ id, roles: [role] }`.
2. Document env vars in comment block and [`../../development.md`](../../../foundations/development.md) if needed.
3. Home page or README: how to switch role for manual S1/S4 checks.

## Verify (stop gate)

- [ ] `LATCH_STUB_ROLE=office_admin npm run dev` — API returns financial fields
- [ ] Default (tech) — financial fields omitted
- [ ] `STATUS.md` → **16-job-detail-page.md**

## Out of scope

Clerk / NextAuth integration.
