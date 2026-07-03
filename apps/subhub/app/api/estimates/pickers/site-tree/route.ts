import { jsonSuccess, withApiHandler } from "@latch/app-kit";
import { ValidationError } from "@latch/contracts";

import { getPool, resolveContext } from "../../../../../lib/latch";
import { loadEstimateSiteTree } from "../../../../../lib/estimates/repository/estimate-site-tree";
import { assertSiteExists } from "../../../../../lib/estimates/repository/estimate-write";
import { assertSurfaceRead } from "../../../../../lib/surfaces/assert-surface-read";

export const GET = async (request: Request): Promise<Response> =>
  withApiHandler(async () => {
    const ctx = await resolveContext({ surfaceId: "estimate_detail" });
    assertSurfaceRead(ctx);

    const siteId = new URL(request.url).searchParams.get("site_id")?.trim();
    if (!siteId) {
      throw new ValidationError("site_id is required", {
        field: "site_id",
        code: "required",
      });
    }

    const pool = getPool();
    await assertSiteExists(pool, siteId);
    const site_tree = await loadEstimateSiteTree(pool, siteId);

    return jsonSuccess({ site_tree }, ctx.manifest);
  });
