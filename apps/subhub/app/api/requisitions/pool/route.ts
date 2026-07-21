import { jsonSuccess, withApiHandler } from "@latch/app-kit";
import { ForbiddenError, surfaceAllows, ValidationError } from "@latch/contracts";

import { getPool, resolveContext } from "@/lib/latch";
import {
  loadJobsWithOpenDemand,
  loadPoolRollupForJob,
  loadVendorParties,
} from "@/lib/purchase-orders/repository/pool";

/**
 * Open-demand PO pool for `/requisitions` (task 58).
 * Jobs = those with ≥1 open request. Rows require `job_id` (no all-jobs table).
 */
export const GET = async (request: Request): Promise<Response> =>
  withApiHandler(async () => {
    const ctx = await resolveContext({ surfaceId: "job_material_request_list" });
    if (!surfaceAllows(ctx.manifest, "read")) {
      throw new ForbiddenError();
    }

    const url = new URL(request.url);
    const jobId = url.searchParams.get("job_id");
    if (jobId !== null && jobId.trim() === "") {
      throw new ValidationError("job_id must be non-empty when provided", {
        field: "job_id",
        code: "invalid_job_id",
      });
    }

    // Create POs is gated on PO create write (not only material-request read).
    let canCreatePos = false;
    try {
      const poCtx = await resolveContext({
        surfaceId: "purchase_order_detail",
        entityId: "new",
      });
      canCreatePos = surfaceAllows(poCtx.manifest, "write");
    } catch {
      canCreatePos = false;
    }

    const pool = getPool();
    const [jobs, vendors, rows] = await Promise.all([
      loadJobsWithOpenDemand(pool),
      loadVendorParties(pool),
      jobId ? loadPoolRollupForJob(pool, jobId) : Promise.resolve([]),
    ]);

    return jsonSuccess({ jobs, vendors, rows, canCreatePos }, ctx.manifest);
  });
