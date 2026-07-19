import { jsonSuccess, withApiHandler } from "@latch/app-kit";
import { ValidationError } from "@latch/contracts";

import { getPool, resolveContext } from "../../../../lib/latch";
import { loadBomPoolForJob } from "../../../../lib/requested-orders/repository";
import { assertSurfaceRead } from "../../../../lib/surfaces/assert-surface-read";

/**
 * BOM "still needed" pool — used by Field / PO workbench (task 52/56).
 */
export const GET = async (request: Request): Promise<Response> =>
  withApiHandler(async () => {
    const ctx = await resolveContext({ surfaceId: "job_material_request_list" });
    assertSurfaceRead(ctx);

    const url = new URL(request.url);
    const jobId = url.searchParams.get("job_id");
    if (!jobId) {
      throw new ValidationError("job_id is required", { field: "job_id", code: "required" });
    }

    const rows = await loadBomPoolForJob(getPool(), jobId);
    return jsonSuccess({ rows }, ctx.manifest);
  });
