# Bootstrap f — Explicitly out of scope (first temp apps)

> **Status:** Proposal (2026-06-10). Constraints for the first CLI-born apps. Revisit per app in `apps/<slug>/docs/` if scope expands.

## First-go exclusions

| Topic | Stance | Notes |
|-------|--------|-------|
| **Audit trail UI** | Out | No `/audit`, no per-entity history viewer |
| **Delete recovery** | Out | No `restoreFromAuditEntry` wiring, no restore CLI |
| **Approval / pending** | Out | Do not pass `pendingStore` to DAL; skip `latch_pending_changes` wiring even if migration exists |
| **IAM Surfaces in app** | Out | User/role CRUD stays in `spike_policy` |
| **Bulk update/delete** | Out | Single-record CRUD sufficient for scaffold proof |
| **Second business domain** | Out | One domain (widgets) until bootstrap a–e green |
| **`<SurfaceForm>`** | Out | Use `lib/forms` primitives ([d](./d-forms.md)) |
| **Scoped row demo** | Optional | Phase 1 widgets can omit `scope_id`; add when testing Phase 08 in UI |

---

## In scope (do not skip)

| Topic | Stance |
|-------|--------|
| **Silent audit writes** | In — `latch_audit` rows on insert/update/delete ([e](./e-crud.md)) |
| **Auth.js login** | In — ([a](./a-authentication.md)) |
| **Runtime roles from DB** | In — including `system_iam` + `system_data` bootstrap ([b](./b-authorization.md)) |
| **Manifest-driven UI** | In — omission, read-only, action hiding |

---

## Distinction: audit table vs audit product

Platform table `latch_audit` in Neon is **infrastructure** — same table for IAM and business mutations. “No audit trail” means **no operator UI**, not “no writes.”

---

## When to promote scope

Add audit viewer, restore, or approval only after:

1. `latch new` + bootstrap a–e proven on one app
2. Dated decision in app docs or new phase folder
3. Threat/verify gates defined before implementation

---

## Related

- [e — CRUD](./e-crud.md)
- [Phase 04 restore](../../../packages/docs/phases/04-audit-lifecycle/tasks/07-restore-tool.md) — library exists; not wired in temp apps
- [Phase 05 verification](../../../packages/docs/phases/05-verification/README.md)
