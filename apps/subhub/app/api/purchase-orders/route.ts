import { jsonSuccess, parseOffsetLimitQuery, withApiHandler } from "@latch/app-kit";

import { loadSurfaceListQuery } from "../../../lib/surfaces/load-surface-list";

export const GET = async (request: Request): Promise<Response> =>
  withApiHandler(async () => {
    const url = new URL(request.url);
    const query = (parseOffsetLimitQuery(request) ?? {}) as Record<string, unknown>;
    const jobId = url.searchParams.get("job_id");
    const status = url.searchParams.get("status");
    const vendorPartyId = url.searchParams.get("vendor_party_id");
    if (jobId) {
      query.job_id = jobId;
    }
    if (status) {
      query.status = status;
    }
    if (vendorPartyId) {
      query.vendor_party_id = vendorPartyId;
    }
    const { data, manifest } = await loadSurfaceListQuery(
      "purchase_order_list",
      query,
    );
    return jsonSuccess(data, manifest);
  });
