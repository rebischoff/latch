import {
  createSurfaceListRouteHandlers,
  parseOffsetLimitQuery,
} from "@latch/app-kit";

import { ensureContactsDal } from "../../../lib/contacts/dal.js";
import { resolveContext, resolveContextFresh } from "../../../lib/latch.js";

const handlers = createSurfaceListRouteHandlers({
  resolveContext,
  resolveContextFresh,
  toListInput: () => ({ surfaceId: "vendor_list" }),
  parseListQuery: parseOffsetLimitQuery,
  dal: {
    list: async (ctx, query) => {
      const dal = await ensureContactsDal();
      return dal.vendorList.list!(ctx, query);
    },
  },
});

export const GET = async (request: Request): Promise<Response> => {
  await ensureContactsDal();
  return handlers.GET(request);
};
