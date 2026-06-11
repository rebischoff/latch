# Bootstrap e — CRUD (create, edit, delete)

> **Status:** Proposal (2026-06-10). General plan for scaffolded temp apps.

## Goal

Full **create / edit / delete** for the anchor table through DAL + thin app helpers, with **silent** writes to platform `latch_audit`. No audit browser UI ([f](./f-explicitly-out-of-scope.md)).

---

## Store adapter

Replace in-memory spike stores with **Postgres** `StoreAdapter` implementation:

| Method | Used by |
|--------|---------|
| `get`, `list` | Read paths + row visibility filter |
| `upsert` | Patch apply |
| `insert` | Create helper (app-owned) |
| `delete` | DAL `delete` |
| `isRowVisibleToPrincipal` | Row scope (`own` / `all` / `scope`) |

Wire `ensureAuditWriter()` at app bootstrap (`lib/audit-bootstrap.ts` — copy pattern from `spike_policy`).

---

## Edit

Server Action:

```ts
const ctx = await resolveContext("widget_detail");
await widgetDetailDal.patch(ctx, id, patchBody);
```

DAL writes `update` audit row when writer configured.

---

## Delete

Server Action or route:

```ts
const ctx = await resolveContext("widget_detail");
await widgetDetailDal.delete(ctx, id);
```

Hard delete only — row removed; `delete` audit with `before` snapshot per descriptor `auditSnapshot`.

---

## Create (app helper — DAL has no generic insert)

`@latch/dal` `createSurfaceDal` exposes `get`, `patch`, `delete`, `bulk*` — **not** `insert`.

Add `lib/widget/create-widget.ts` (example):

1. `resolveContext('widget_detail')` (or list surface if create mode lives there)
2. Parse body with `narrowWritableSchema(...).strict()`
3. Assert field/surface write grants
4. `store.insert(row)` 
5. `writeAudit({ action: 'insert', entity_type, entity_id, module_id, before: null, after, ... })`
6. Return projected DTO via `descriptor.projectRow`

**Authorization:** grant `write` on creatable fields for `widget_editor`; viewer has no create button.

---

## REST (optional first go)

Minimum v1: **Server Actions only** for mutate. Add `GET/PATCH /api/widgets/[id]` later if export/streaming needed ([api-style](../../../packages/docs/reference/api-style.md)).

---

## Audit (silent)

| Operation | Audit `action` |
|-----------|----------------|
| Create | `insert` |
| Edit | `update` |
| Delete | `delete` |

Verify in Neon `latch_audit` during dev — no in-app list.

**No** `restoreFromAuditEntry`, no `npm run restore-audit` in temp app v1.

---

## Verify

- [ ] Editor creates widget → row in `widgets` + `insert` audit row
- [ ] Editor patches label → `update` audit row
- [ ] Editor deletes → row gone + `delete` audit with `before`
- [ ] Viewer cannot invoke create/edit/delete (action returns 403 or UI hidden)
- [ ] Crafted POST with extra JSON keys → strict rejection

---

## Related

- [d — Forms](./d-forms.md)
- [f — Out of scope](./f-explicitly-out-of-scope.md)
- `@latch/dal` `create-surface-dal.ts`
- `@latch/audit` `writeAudit`, `restore.ts` (restore not wired)
