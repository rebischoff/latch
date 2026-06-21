import type { SurfaceDal } from "@latch/dal";

import type { ResolveContextApi } from "./create-resolve-context";

export type SurfaceActionsConfig<TInput extends { surfaceId: string }> = {
  dal: Pick<SurfaceDal, "patch" | "delete">;
  toDetailInput: (entityId: string) => TInput;
} & ResolveContextApi<TInput>;

/**
 * Optional Server Action helpers for detail Surfaces.
 * Add `"use server"` in the app module that re-exports these functions.
 */
export const createSurfaceActions = <TInput extends { surfaceId: string }>(
  config: SurfaceActionsConfig<TInput>,
): {
  patch: (entityId: string, body: unknown) => Promise<Record<string, unknown>>;
  deleteEntity: (entityId: string) => Promise<void>;
} => ({
  patch: async (entityId, body) => {
    const ctx = await config.resolveContextFresh(
      config.toDetailInput(entityId),
    );
    return config.dal.patch(ctx, entityId, body);
  },
  deleteEntity: async (entityId) => {
    const ctx = await config.resolveContextFresh(
      config.toDetailInput(entityId),
    );
    await config.dal.delete(ctx, entityId);
  },
});
