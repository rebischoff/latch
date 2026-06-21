import {
  createSurfaceListRouteHandlers,
  parseOffsetLimitQuery,
} from "@latch/app-kit";

import { ensureContactsDal } from "../../../lib/contacts/dal";
import { resolveContext, resolveContextFresh } from "../../../lib/latch";

const handlers = createSurfaceListRouteHandlers({
  resolveContext,
  resolveContextFresh,
  toListInput: () => ({ surfaceId: "customer_list" }),
  parseListQuery: parseOffsetLimitQuery,
  dal: {
    list: async (ctx, query) => {
      const dal = await ensureContactsDal();
      return dal.customerList.list!(ctx, query);
    },
  },
});

export const GET = async (request: Request): Promise<Response> => {
  await ensureContactsDal();
  return handlers.GET(request);
};
