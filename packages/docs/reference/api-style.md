# API style

How the platform exposes server functionality. Decided after weighing REST route handlers, Server Actions, tRPC, and GraphQL.

## Decision: hybrid REST + Server Actions (2026-05-27)

**Choice:**

1. **REST route handlers** are the *contract surface*. Built via a factory (`createSurfaceRouteHandlers(surfaceDef)`) in `@<project>/dal`.
2. **Server Actions** are an *ergonomic sugar* for internal RSC forms. Built via `createSurfaceActions(surfaceDef)`. Backed by the same DAL.
3. **No tRPC. No GraphQL.** Not in v1, not blocked from a future pass.

**Rationale:**

- Server Actions give the best DX for internal forms (zero serialization, type-safe call-site, manifest already in tree). Use them when nothing external will ever call.
- REST handlers are openable (mobile, scripts, integrations, BI) and are the only style that survives long term without lock-in.
- Both share the same DAL ? no enforcement drift.
- GraphQL inverts the manifest model (client picks fields; server says no). Too much friction for a Field-permission-first system, and overkill solo.
- tRPC is excellent DX but TS-client-only and adds another abstraction; defer.

## When to use which

| Use case | Style | Why |
|---|---|---|
| RSC form mutation, internal only | Server Action | Best DX; no extra wire |
| List / detail read | REST handler | Cacheable, paginatable, externalizable later |
| Bulk update / delete | REST handler | Wants request-id correlation, partial-result reporting, observability |
| CSV / file export | REST handler | Needs streaming |
| Background-trigger endpoints | REST handler | Webhook-shape |
| Admin tools (sample app only) | Either | Server Action OK; route handler if you might script it |

## Route handler factory (sketch)

```ts
// packages/dal/src/surface/handlers.ts (illustrative)
export function createSurfaceRouteHandlers<S extends SurfaceDef>(surface: S) {
  return {
    GET: async (req: Request, { params }) => {
      const ctx = await resolvePermissionContext(req, surface);
      const dto = await dal[surface.id].get(ctx, params.id);
      return Response.json(dto);
    },
    PATCH: async (req: Request, { params }) => {
      const ctx = await resolvePermissionContext(req, surface);
      const body = surface.writableSchema(ctx.manifest).parse(await req.json());
      const dto = await dal[surface.id].update(ctx, params.id, body);
      return Response.json(dto);
    },
    DELETE: async (req: Request, { params }) => {
      const ctx = await resolvePermissionContext(req, surface);
      await dal[surface.id].delete(ctx, params.id);
      return new Response(null, { status: 204 });
    },
  };
}
```

```ts
// apps/web/app/api/jobs/[id]/route.ts (consumer)
import { jobDetailSurface } from "@/modules/job/job_detail.surface";
export const { GET, PATCH, DELETE } = createSurfaceRouteHandlers(jobDetailSurface);
```

## Server Action helper (sketch)

```ts
// packages/dal/src/surface/actions.ts (illustrative)
export function createSurfaceActions<S extends SurfaceDef>(surface: S) {
  return {
    update: async (id: string, formData: FormData) => {
      "use server";
      const ctx = await resolvePermissionContextForRSC(surface);
      const body = surface.writableSchema(ctx.manifest)
                          .parse(Object.fromEntries(formData));
      return dal[surface.id].update(ctx, id, body);
    },
  };
}
```

## Why both styles share one DAL

Single enforcement path = single threat-model surface (see [`../threat-model.md`](../foundations/threat-model.md) T2, T3, T10, T15). If you have to defend two enforcement layers, one drifts. Always.

## Pros / cons (recorded for posterity)

| Style | Pros | Cons |
|---|---|---|
| REST route handlers | Open, language-agnostic, cacheable, OpenAPI-able, mobile-friendly | Boilerplate; no e2e type-safety without bridge |
| Server Actions | Best RSC DX; zero serialization | **Not openable**; bound to React; hard to test isolated; awkward error model |
| tRPC | Top TS DX; clean middleware for `PermissionContext` | TS-only client; another abstraction; public-API workaround needed |
| GraphQL | Strong schema; field selection looks like Fields | Inverts manifest model; resolver auth complexity; heavy; overkill solo |

## Reopening criteria

We'd revisit:

- **tRPC** if internal forms become an outsized maintenance burden and 90%+ of consumers stay TS.
- **GraphQL** if external integrations demand polymorphic field selection across many entities. Probably never for trades-CRM.
- **OpenAPI codegen** as soon as a non-TS client appears (mobile, integrations).

## Related

- [`../scope.md`](../foundations/scope.md)
- [`packages.md`](./packages.md)
- [`permissions-and-ui-sync.md`](./permissions-and-ui-sync.md)
- [`bulk-operations.md`](./bulk-operations.md)
