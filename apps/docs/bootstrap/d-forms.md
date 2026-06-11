# Bootstrap d — Forms (RHF controllers)

> **Status:** Proposal (2026-06-10). General plan for scaffolded temp apps.

## Goal

**Reusable** React Hook Form + manifest-aware field components under `lib/forms/` — copy into the next temp app or extract to `@latch/react` once stable.

**Not in v1:** `<SurfaceForm>` (discussion 06) — iterate fields manually using shared primitives.

---

## Stack

| Layer | Choice |
|-------|--------|
| Forms | React Hook Form |
| Validation | `zodResolver` + `narrowPatchSchema` / `narrowWritableSchema` from `@latch/contracts` |
| UI widgets | Ant Design 6 (`Input`, `Select`, …) |
| Alignment | `fieldAllows(manifest, fieldId, 'read' \| 'write')` |

Reference hand-written form: `spike_policy/app/components/user-detail-form.tsx`.

---

## Shared components (`lib/forms/`)

| Component | Behavior |
|-----------|----------|
| `ManifestField` | If no `read` → render nothing; if `read` && !`write` → read-only children |
| `LatchTextField` | `Controller` + `Input`; `name` matches patch shape (`label: { label: string }` per glue) |
| `LatchSelectField` | Same for enums / status |
| `useLatchPatchForm` | `(manifest, patchSchema) => useForm({ resolver: zodResolver(narrow...) })` |

Patch body shape follows **generated glue** nested field DTOs — do not flatten unless glue does.

---

## Page integration

1. RSC page loads row + manifest → passes to client `*DetailForm`.
2. Client wraps with `CapabilitiesProvider` (`@latch/react`).
3. Submit → Server Action → re-`resolveContext` → DAL `patch` ([e](./e-crud.md)).
4. Use `<Can manifest={manifest} action="write">` for Save button when surface-level action gating is clearer than field-level.

---

## Read-only fields

Manifest `read` without `write` → disabled input or plain text — **field still visible**. Unreadable fields → omit entirely (match DAL omission).

---

## Extraction path

When two temp apps share identical `lib/forms/`:

1. Move to `packages/react/src/forms/` or new `@latch/react-rhf`
2. Keep Ant Design as peer dependency (skin-flexible per discussion 06)

---

## Verify

- [ ] Viewer: detail shows read-only values; no Save
- [ ] Editor: editable fields submit; strict Zod rejects unknown keys (400 from action)
- [ ] Field dropped from manifest does not appear in DOM
- [ ] Same controller used on list create and detail edit where shapes match

---

## Related

- [c — Navigation](./c-navigation.md)
- [e — CRUD](./e-crud.md)
- [Discussion 06 — UI sync](../../../packages/docs/discussions/06-ui-sync.md)
