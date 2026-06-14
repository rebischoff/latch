import {
  NotFoundError,
  surfaceAllows,
  type PermissionContext,
} from "@latch/contracts";

/** Non-IAM principals get 404 hide on IAM surfaces (default deny). */
export const assertIamSurfaceRead = (ctx: PermissionContext): void => {
  if (!surfaceAllows(ctx.manifest, "read")) {
    throw new NotFoundError();
  }
};
