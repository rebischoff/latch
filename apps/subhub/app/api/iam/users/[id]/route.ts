import {
  createSurfaceRouteHandlers,
  jsonSuccess,
  withApiHandler,
} from "@latch/app-kit";

import { resolveContext, resolveContextFresh } from "../../../../../lib/latch";
import { loadSurfaceDetailQuery } from "../../../../../lib/surfaces/load-surface-detail";
import { getSurfaceDetailDal } from "../../../../../lib/surfaces/surface-loader-registry";

const baseHandlers = createSurfaceRouteHandlers({
  resolveContext,
  resolveContextFresh,
  toDetailInput: (id) => ({ surfaceId: "user_roles_detail", entityId: id }),
  dal: {
    get: async (ctx, id) => {
      const dal = await getSurfaceDetailDal("user_roles_detail");
      return dal.get(ctx, id);
    },
    patch: async (ctx, id, body) => {
      const dal = await getSurfaceDetailDal("user_roles_detail");
      return dal.patch(ctx, id, body);
    },
    delete: async () => {
      throw new Error("DELETE not supported on user_roles_detail");
    },
  },
});

export const GET = async (
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> =>
  withApiHandler(async () => {
    const { id } = await context.params;
    const { data, manifest } = await loadSurfaceDetailQuery("user_roles_detail", id);
    return jsonSuccess(data, manifest);
  });

export const PATCH = async (
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> => baseHandlers.PATCH(request, context);
