import { jsonSuccess, parseOffsetLimitQuery, withApiHandler } from "@latch/app-kit";

import { loadSurfaceListQuery } from "../../../../lib/surfaces/load-surface-list";

export const GET = async (request: Request): Promise<Response> =>
  withApiHandler(async () => {
    const query = parseOffsetLimitQuery(request);
    const { data, manifest } = await loadSurfaceListQuery("role_list", query);
    return jsonSuccess(data, manifest);
  });
