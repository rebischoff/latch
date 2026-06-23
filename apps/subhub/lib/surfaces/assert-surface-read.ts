import { surfaceAllows, type PermissionContext } from "@latch/contracts";

import { SurfaceNotFoundError } from "./surface-not-found-error";

export const assertSurfaceRead = (ctx: PermissionContext): void => {
  if (!surfaceAllows(ctx.manifest, "read")) {
    throw new SurfaceNotFoundError();
  }
};
