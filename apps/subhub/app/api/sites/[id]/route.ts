import {
  createSurfaceRouteHandlers,
  jsonSuccess,
  withApiHandler,
} from "@latch/app-kit";

import { withSubhubApiHandler } from "../../../../lib/api-handler";
import { resolveContext, resolveContextFresh } from "../../../../lib/latch";
import { ensureSitesDal } from "../../../../lib/sites/dal";
import { loadSurfaceDetailQuery } from "../../../../lib/surfaces/load-surface-detail";
import { getSurfaceDetailDal } from "../../../../lib/surfaces/surface-loader-registry";

const baseHandlers = createSurfaceRouteHandlers({
  resolveContext,
  resolveContextFresh,
  toDetailInput: (id) => ({ surfaceId: "site_detail", entityId: id }),
  dal: {
    get: async (ctx, id) => {
      const dal = await getSurfaceDetailDal("site_detail");
      return dal.get(ctx, id);
    },
    patch: async (ctx, id, body) => {
      const dal = await getSurfaceDetailDal("site_detail");
      return dal.patch(ctx, id, body);
    },
    delete: async (ctx, id) => {
      const dal = await getSurfaceDetailDal("site_detail");
      return dal.delete(ctx, id);
    },
  },
});

export const GET = async (
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> =>
  withApiHandler(async () => {
    const { id } = await context.params;
    const { data, manifest } = await loadSurfaceDetailQuery("site_detail", id);
    return jsonSuccess(data, manifest);
  });

export const PATCH = async (
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> => baseHandlers.PATCH(request, context);

export const DELETE = async (
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> =>
  withSubhubApiHandler(async () => {
    const { id } = await context.params;
    const ctx = await resolveContextFresh({
      surfaceId: "site_detail",
      entityId: id,
    });
    const dal = await ensureSitesDal();
    await dal.siteDetail.delete(ctx, id);
    return new Response(null, { status: 204 });
  });
