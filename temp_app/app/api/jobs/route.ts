import {
  createSurfaceListRouteHandlers,
  parseOffsetLimitQuery,
} from "@latch/app-kit";

import { jobListDal } from "../../../lib/jobs/dal.js";
import { resolveContext, resolveContextFresh } from "../../../lib/latch.js";

const { GET } = createSurfaceListRouteHandlers({
  dal: jobListDal,
  resolveContext,
  resolveContextFresh,
  toListInput: () => ({ surfaceId: "job_list" }),
  parseListQuery: parseOffsetLimitQuery,
});

export { GET };
