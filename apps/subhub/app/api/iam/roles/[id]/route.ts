import { createSurfaceRouteHandlers } from "@latch/app-kit";

import { ensureIamDal } from "../../../../../lib/iam/dal.js";
import { resolveContext, resolveContextFresh } from "../../../../../lib/latch.js";

const baseHandlers = createSurfaceRouteHandlers({
  resolveContext,
  resolveContextFresh,
  toDetailInput: (id) => ({ surfaceId: "role_detail", entityId: id }),
  dal: {
    get: async (ctx, id) => {
      const dal = await ensureIamDal();
      return dal.roleDetail.get(ctx, id);
    },
    patch: async (ctx, id, body) => {
      const dal = await ensureIamDal();
      return dal.roleDetail.patch(ctx, id, body);
    },
    delete: async (ctx, id) => {
      const dal = await ensureIamDal();
      return dal.roleDetail.delete(ctx, id);
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

export const DELETE = async (
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> => {
  await ensureIamDal();
  return baseHandlers.DELETE(request, context);
};
