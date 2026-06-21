import {
  createSurfaceListRouteHandlers,
  parseOffsetLimitQuery,
} from "@latch/app-kit";

import { ensureIamDal } from "../../../../lib/iam/dal";
import { resolveContext, resolveContextFresh } from "../../../../lib/latch";

const handlers = createSurfaceListRouteHandlers({
  resolveContext,
  resolveContextFresh,
  toListInput: () => ({ surfaceId: "user_list" }),
  parseListQuery: parseOffsetLimitQuery,
  dal: {
    list: async (ctx, query) => {
      const dal = await ensureIamDal();
      return dal.userList.list!(ctx, query);
    },
  },
});

export const GET = async (request: Request): Promise<Response> => {
  await ensureIamDal();
  return handlers.GET(request);
};
