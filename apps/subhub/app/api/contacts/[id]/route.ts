import { createSurfaceRouteHandlers } from "@latch/app-kit";

import { ensureContactsDal } from "../../../../lib/contacts/dal";
import { resolveContext, resolveContextFresh } from "../../../../lib/latch";

const baseHandlers = createSurfaceRouteHandlers({
  resolveContext,
  resolveContextFresh,
  toDetailInput: (id) => ({ surfaceId: "contact_detail", entityId: id }),
  dal: {
    get: async (ctx, id) => {
      const dal = await ensureContactsDal();
      return dal.contactDetail.get(ctx, id);
    },
    patch: async (ctx, id, body) => {
      const dal = await ensureContactsDal();
      return dal.contactDetail.patch(ctx, id, body);
    },
    delete: async (ctx, id) => {
      const dal = await ensureContactsDal();
      return dal.contactDetail.delete(ctx, id);
    },
  },
});

export const GET = async (
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> => {
  await ensureContactsDal();
  return baseHandlers.GET(request, context);
};

export const PATCH = async (
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> => {
  await ensureContactsDal();
  return baseHandlers.PATCH(request, context);
};

export const DELETE = async (
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> => {
  await ensureContactsDal();
  return baseHandlers.DELETE(request, context);
};
