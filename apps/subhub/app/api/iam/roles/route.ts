import {
  createSurfaceListRouteHandlers,
  parseOffsetLimitQuery,
} from "@latch/app-kit";

import { ensureIamDal } from "../../../../lib/iam/dal.js";
import { resolveContext, resolveContextFresh } from "../../../../lib/latch.js";

const handlers = createSurfaceListRouteHandlers({
  resolveContext,
  resolveContextFresh,
  toListInput: () => ({ surfaceId: "role_list" }),
  parseListQuery: parseOffsetLimitQuery,
  dal: {
    list: async (ctx, query) => {
      const dal = await ensureIamDal();
      return dal.roleList.list!(ctx, query);
    },
  },
});

export const GET = async (request: Request): Promise<Response> => {
  await ensureIamDal();
  return handlers.GET(request);
};
