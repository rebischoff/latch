# Discussion 06 — UI sync

> **Status:** Open (2026-06-05). Compartment 5 in the [map](../reference/compartments.md#5-ui-sync-client).

## Shared understanding

- The UI **renders from the manifest** and is **never a security boundary** — hiding a control is not enforcement; the DAL already omitted forbidden data server-side.
- `@latch/react` provides `CapabilitiesProvider`, `<Can>`, and `<FieldControl>`; the client imports only `@latch/contracts` + `@latch/react`, never server packages.
- The manifest is delivered to the client (e.g. via RSC props) as a **rendering cache**, not an auth token.
- Page components and layout are **per-app**; the platform supplies the primitives that read the manifest.

## UI/permission alignment requirements

The UI must match what the manifest grants so users never see controls they can't use. This is a **UX obligation**, not security — the DAL still validates and omits server-side regardless of what the client renders (see [invariants](../../../.cursor/rules/10-invariants.mdc), [00-overview](./00-overview.md)).

| Manifest state | Required UI behavior |
|---|---|
| Action **not** granted (`delete`, `create`, `approve`, …) | **Action hiding** — don't render the control (Delete button, "New" link, bulk action, approve affordance). |
| Field **not** readable | **Field omission** — don't render the field at all (no label, no empty cell). The DTO won't contain it anyway. |
| Field readable but **not** writable | **Read-only rendering** — show the value but disable/replace the input (no editable control, no submit of that key). |
| Field readable **and** writable | Render the normal editable control. |

Notes:

- These behaviors are driven by the **same manifest** the server resolved — the client must not infer permissions from any other source.
- Read-only is distinct from omitted: a read-only field is still shown; an unreadable field is absent entirely.
- Hidden ≠ secure. A user who forges a request still hits server enforcement (strict writes reject unknown/non-writable keys; forbidden reads are omitted or 403/404).

### Decision: Forms, UI kit, shell — opinionated/flexible (2026-06-05)

Sorted via the [spine-vs-skin rule](./00-overview.md#decision-opinionated-vs-flexible--spine-vs-skin-2026-06-05):

- **C — Forms (opinionated *alignment*, flexible *look*):** ship a manifest-driven **`<SurfaceForm>`** in `@latch/react` (a **runtime** component, not generated code). It iterates the surface's fields and **automatically applies** the alignment table above — omit unreadable fields, render read-only where not writable, show editable widgets where writable, and gate Save/Delete/New/approve on surface actions. So alignment is a **property of the system**, not of per-field developer discipline.
  - **C.1 — Widgets (flexible):** widget chosen by **column type by default, with per-field overrides** supplied by the app. Look & feel stays app-owned.
  - **C.2 — Scope:** `<SurfaceForm>` does **rendering + alignment + client-side validation** by reusing the generated, **manifest-narrowed Zod schema** (so client validation matches the server). Data fetch/submit stay in the app via an `onSubmit` callback.
  - **C.3 — Escape hatch:** `<SurfaceForm>` is the **single-table 80% path**; complex/multi-table surfaces (e.g. `job_detail`) drop to the **Level-1 primitives** (`<FieldControl>` / `<Can>`).
  - *Note:* this is deliberately **not** full codegen of form JSX (which drifts after edits) — codegen only emits the metadata/descriptor `<SurfaceForm>` consumes.
- **D — UI kit (flexible):** not tied to any specific component library.
- **E — App shell / theme (flexible):** app-owned.

## Points to confirm

1. UI is a **render layer over the manifest**, with zero security responsibility.
2. The client may import **only** `contracts` + `react` (boundary stays enforceable).
3. Codegen may produce **UI-driving metadata** and *optionally* a one-time starter page, but does **not** own page components.
4. The **action hiding / field omission / read-only** behaviors above are the required baseline for every Latch surface UI.
5. **Alignment is automatic** via `<SurfaceForm>` for single-table surfaces; primitives remain the escape hatch — see Decision (C).

## Open questions

- ~~How standardized should the per-app UI be vs fully app-owned?~~ **Resolved (D/E): UI kit and shell/theme are flexible/app-owned.**
- ~~Generated form scaffolding vs field-level metadata only?~~ **Resolved (C): a runtime manifest-driven `<SurfaceForm>` over generated metadata — not generated JSX.**
- ~~Is Ant Design the template default UI kit?~~ **Resolved (D): no fixed default; UI kit is flexible.**

## Related

- [`../reference/permissions-and-ui-sync.md`](../reference/permissions-and-ui-sync.md), [`packages/react/src/index.ts`](../../react/src/index.ts)
