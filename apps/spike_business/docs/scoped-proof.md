# Scoped row visibility proof

Phase 08 task 04 consumer proof — **memory harness** (no UI).

## Flow

```mermaid
sequenceDiagram
  participant Test
  participant Policy as PolicyService
  participant DAL as createSurfaceDal
  participant Store as MemoryWidgetStore

  Test->>Policy: resolve(principal, widget_list)
  Policy-->>Test: manifest.rowScope=scope, scopeIds=[Branch A]
  Test->>DAL: list(ctx)
  DAL->>Store: list({ rowScope, scopeIds })
  Store-->>DAL: rows where scope_id ∈ scopeIds
  DAL-->>Test: projected DTOs
```

## Stop gate

- `widgets.scope_id` migrated + seeded (`011`, `900`)
- `scoped-visibility.test.ts` green under `npm run test`
- Store adapter passes `scopeIds` from manifest on list/get/bulk paths
