import { jsonSuccess, parseOffsetLimitQuery, withApiHandler } from "@latch/app-kit";

import { loadSurfaceListQuery } from "../../../lib/surfaces/load-surface-list";

export const GET = async (request: Request): Promise<Response> =>
  withApiHandler(async () => {
    const url = new URL(request.url);
    const query = (parseOffsetLimitQuery(request) ?? {}) as Record<string, unknown>;
    const jobId = url.searchParams.get("job_id");
    const status = url.searchParams.get("status");
    const siteZoneId = url.searchParams.get("site_zone_id");
    if (jobId) {
      query.job_id = jobId;
    }
    if (status) {
      query.status = status;
    }
    if (siteZoneId !== null) {
      query.site_zone_id = siteZoneId;
    }
    const { data, manifest } = await loadSurfaceListQuery(
      "job_material_request_list",
      query,
    );
    return jsonSuccess(data, manifest);
  });
