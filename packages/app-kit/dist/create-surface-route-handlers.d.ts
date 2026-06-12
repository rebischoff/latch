import type { SurfaceDal } from "@latch/dal";
import type { ResolveContextApi } from "./create-resolve-context.js";
type RouteParams = {
    params: Promise<{
        id: string;
    }>;
};
export type SurfaceDetailRouteConfig<TInput extends {
    surfaceId: string;
}> = {
    dal: SurfaceDal;
    toDetailInput: (entityId: string) => TInput;
} & ResolveContextApi<TInput>;
/** REST factory for detail Surfaces — GET / PATCH / DELETE by entity id. */
export declare const createSurfaceRouteHandlers: <TInput extends {
    surfaceId: string;
}>(config: SurfaceDetailRouteConfig<TInput>) => {
    GET: (request: Request, context: RouteParams) => Promise<Response>;
    PATCH: (request: Request, context: RouteParams) => Promise<Response>;
    DELETE: (request: Request, context: RouteParams) => Promise<Response>;
};
export type SurfaceListRouteConfig<TInput extends {
    surfaceId: string;
}> = {
    dal: Pick<SurfaceDal, "list"> & {
        list: NonNullable<SurfaceDal["list"]>;
    };
    toListInput: () => TInput;
    parseListQuery?: (request: Request) => Record<string, unknown> | undefined;
} & ResolveContextApi<TInput>;
/** REST factory for list Surfaces — GET with optional query params. */
export declare const createSurfaceListRouteHandlers: <TInput extends {
    surfaceId: string;
}>(config: SurfaceListRouteConfig<TInput>) => {
    GET: (request: Request) => Promise<Response>;
};
declare const parseOffsetLimitQuery: (request: Request) => Record<string, unknown> | undefined;
export { parseOffsetLimitQuery };
//# sourceMappingURL=create-surface-route-handlers.d.ts.map