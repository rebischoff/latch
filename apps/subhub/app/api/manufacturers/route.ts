import {
  createSurfaceListRouteHandlers,
  jsonSuccess,
  parseOffsetLimitQuery,
} from "@latch/app-kit";

import { withSubhubApiHandler } from "../../../lib/api-handler";
import { ensureContactsDal } from "../../../lib/contacts/dal";
import { resolveContext, resolveContextFresh } from "../../../lib/latch";
import { assertSurfaceRead } from "../../../lib/surfaces/assert-surface-read";
import { createListFromRegistry } from "../../../lib/surfaces/surface-loader-registry";

const handlers = createSurfaceListRouteHandlers({
  resolveContext,
  resolveContextFresh,
  toListInput: () => ({ surfaceId: "manufacturer_list" }),
  parseListQuery: parseOffsetLimitQuery,
  dal: {
    list: async (ctx, query) => {
      const dal = await ensureContactsDal();
      return dal.manufacturerList.list!(ctx, query);
    },
  },
});

export const GET = async (request: Request): Promise<Response> => {
  await ensureContactsDal();
  return handlers.GET(request);
};

export const POST = async (request: Request): Promise<Response> =>
  withSubhubApiHandler(async () => {
    const ctx = await resolveContextFresh({
      surfaceId: "manufacturer_detail",
      entityId: "new",
    });
    assertSurfaceRead(ctx);
    const body: unknown = await request.json();
    const data = await createListFromRegistry("manufacturer_list", ctx, body);
    return jsonSuccess(data, ctx.manifest);
  });
