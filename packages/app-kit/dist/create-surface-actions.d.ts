import type { SurfaceDal } from "@latch/dal";
import type { ResolveContextApi } from "./create-resolve-context.js";
export type SurfaceActionsConfig<TInput extends {
    surfaceId: string;
}> = {
    dal: Pick<SurfaceDal, "patch" | "delete">;
    toDetailInput: (entityId: string) => TInput;
} & ResolveContextApi<TInput>;
/**
 * Optional Server Action helpers for detail Surfaces.
 * Add `"use server"` in the app module that re-exports these functions.
 */
export declare const createSurfaceActions: <TInput extends {
    surfaceId: string;
}>(config: SurfaceActionsConfig<TInput>) => {
    patch: (entityId: string, body: unknown) => Promise<Record<string, unknown>>;
    deleteEntity: (entityId: string) => Promise<void>;
};
//# sourceMappingURL=create-surface-actions.d.ts.map