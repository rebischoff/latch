import type { PermissionContext } from "@latch/contracts";
import type { SurfaceDal } from "@latch/dal";

import { jsonSuccess, withApiHandler } from "./api-response";
import type { ResolveContextApi, ResolveContextOptions } from "./create-resolve-context";

type RouteParams = { params: Promise<{ id: string }> };

export type SurfaceDetailRouteConfig<TInput extends { surfaceId: string }> = {
  dal: SurfaceDal;
  toDetailInput: (entityId: string) => TInput;
} & ResolveContextApi<TInput>;

/** REST factory for detail Surfaces — GET / PATCH / DELETE by entity id. */
export const createSurfaceRouteHandlers = <TInput extends { surfaceId: string }>(
  config: SurfaceDetailRouteConfig<TInput>,
): {
  GET: (request: Request, context: RouteParams) => Promise<Response>;
  PATCH: (request: Request, context: RouteParams) => Promise<Response>;
  DELETE: (request: Request, context: RouteParams) => Promise<Response>;
} => {
  const resolveForRead = (
    input: TInput,
    options?: ResolveContextOptions,
  ): Promise<PermissionContext> =>
    options?.bypassCache
      ? config.resolveContextFresh(input)
      : config.resolveContext(input, options);

  return {
    GET: async (_request, { params }) =>
      withApiHandler(async () => {
        const { id } = await params;
        const ctx = await resolveForRead(config.toDetailInput(id));
        const data = await config.dal.get(ctx, id);
        return jsonSuccess(data, ctx.manifest);
      }),

    PATCH: async (request, { params }) =>
      withApiHandler(async () => {
        const { id } = await params;
        const ctx = await config.resolveContextFresh(config.toDetailInput(id));
        const body: unknown = await request.json();
        const data = await config.dal.patch(ctx, id, body);
        return jsonSuccess(data, ctx.manifest);
      }),

    DELETE: async (_request, { params }) =>
      withApiHandler(async () => {
        const { id } = await params;
        const ctx = await config.resolveContextFresh(config.toDetailInput(id));
        await config.dal.delete(ctx, id);
        return new Response(null, { status: 204 });
      }),
  };
};

export type SurfaceListRouteConfig<TInput extends { surfaceId: string }> = {
  dal: Pick<SurfaceDal, "list"> & { list: NonNullable<SurfaceDal["list"]> };
  toListInput: () => TInput;
  parseListQuery?: (request: Request) => Record<string, unknown> | undefined;
} & ResolveContextApi<TInput>;

/** REST factory for list Surfaces — GET with optional query params. */
export const createSurfaceListRouteHandlers = <
  TInput extends { surfaceId: string },
>(
  config: SurfaceListRouteConfig<TInput>,
): {
  GET: (request: Request) => Promise<Response>;
} => ({
  GET: async (request) =>
    withApiHandler(async () => {
      const ctx = await config.resolveContext(config.toListInput());
      const query = config.parseListQuery?.(request);
      const { rows, total } = await config.dal.list(ctx, query);
      return jsonSuccess({ rows, total }, ctx.manifest);
    }),
});

const parseOffsetLimitQuery = (
  request: Request,
): Record<string, unknown> | undefined => {
  const url = new URL(request.url);
  const limit = url.searchParams.get("limit");
  const offset = url.searchParams.get("offset");
  const status = url.searchParams.get("status");
  const query: Record<string, unknown> = {};
  if (limit !== null) {
    query.limit = Number.parseInt(limit, 10);
  }
  if (offset !== null) {
    query.offset = Number.parseInt(offset, 10);
  }
  if (status !== null) {
    query.status = status;
  }
  return Object.keys(query).length > 0 ? query : undefined;
};

export { parseOffsetLimitQuery };
