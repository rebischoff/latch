# UI spikes

Throwaway or iterative UI built **before** implement specs land — to answer layout and interaction questions that markdown cannot.

**Active program:** [task 22 — estimate wave 4a](../tasks/22-estimate-wave-4a.md).

| Spike | Status | Doc |
|-------|--------|-----|
| **Surface form playground** | ✅ PR 5 ✓ — ready for `SiteDetailForm` migration | [`surface-form-playground.md`](./surface-form-playground.md) |
| **Surface form prefetch** | 📋 Planned — contacts + IAM before [task 20](../tasks/20-ui-discovery.md) step 2.7 | [`surface-form-prefetch.md`](./surface-form-prefetch.md) |
| Estimate line editor | ✅ spec locked — `/estimates/demo` (dev); production wave 4a next | [`estimate-line-editor.md`](./estimate-line-editor.md) |

**Rules:**

- Fixture data and stub API routes are fine; do not skip manifest/policy on **production** Surfaces (sites slice uses real DAL).
- **Form playground** (`/dev/form-playground`) proves shared field/toolbar components before sites UI — see [`surface-form-playground.md`](./surface-form-playground.md).
- Capture decisions in spike notes + `decisions/` + implement spec — spike code may be replaced.
- Link spike route from spike doc so future sessions can find it quickly.
