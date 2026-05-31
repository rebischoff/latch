# Phase 03 — decisions

## Open / to lock (high priority — carried from planning chat)

- [ ] **Built-in role catalog.** Minimum: `iam_master`, `data_master`. Define exact default grants per role.
- [ ] **Data master auto-access to new Surfaces.** Choose mechanism:
  - wildcard grant (`surface: *`, `field: *`) honored by the policy engine, **or**
  - codegen auto-binds every new Surface to `data_master`, **or**
  - "implicit allow-all for declared Surfaces" for that role.
- [ ] **Identity storage.** `latch_user_roles` in the company DB vs IdP-group mapping vs hybrid overlay.
- [ ] **D2 — auth provider** (NextAuth / Clerk / custom JWT / corporate SSO).

## Decided

| Date | Topic | Choice |
|------|-------|--------|
| 2026-05-27 | Authz model | RBAC; users assigned to one or more roles |
| 2026-05-27 | Stub (interim) | `LATCH_STUB_USER` / `LATCH_STUB_ROLE` for local dev |
