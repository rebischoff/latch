# Surface YAML

Add `*.surface.yaml` files in domain subfolders (e.g. `widget/widget_list.surface.yaml`).

Run `npm run codegen -w @latch/subhub` after adding or editing surfaces.

Generated output lands in each module's `generated/` folder — do not hand-edit.

**Timestamps / audit metadata:** omit `created_at`, `updated_at`, and `created_by` from Fields unless manifest-gated UI needs them — see [decisions.md](../docs/decisions/general.md#decision-row-timestamps-vs-audit--ddl-vs-surface-fields-2026-06-13).
