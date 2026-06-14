import { createSurfaceRouteHandlers } from "@latch/app-kit";

import { ensureIamDal } from "../../../../../lib/iam/dal.js";
import { resolveContext, resolveContextFresh } from "../../../../../lib/latch.js";

const baseHandlers = createSurfaceRouteHandlers({
  resolveContext,
  resolveContextFresh,
  toDetailInput: (id) => ({ surfaceId: "user_roles_detail", entityId: id }),
  dal: {
    get: async (ctx, id) => {
      const dal = await ensureIamDal();
      return dal.userRolesDetail.get(ctx, id);
    },
    patch: async (ctx, id, body) => {
      const dal = await ensureIamDal();
      return dal.userRolesDetail.patch(ctx, id, body);
    },
    delete: async () => {
      throw new Error("DELETE not supported on user_roles_detail");
    },
  },
});

export const GET = async (
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> => {
  await ensureIamDal();
  return baseHandlers.GET(request, context);
};

export const PATCH = async (
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> => {
  await ensureIamDal();
  return baseHandlers.PATCH(request, context);
};
