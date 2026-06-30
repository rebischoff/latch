import { jsonSuccess, withApiHandler } from "@latch/app-kit";

import { getPool, resolveContext } from "../../../../../lib/latch";
import { loadCatalogSystems } from "../../../../../lib/estimates/repository/catalog-systems";
import { assertSurfaceRead } from "../../../../../lib/surfaces/assert-surface-read";

export const GET = async (): Promise<Response> =>
  withApiHandler(async () => {
    const ctx = await resolveContext({ surfaceId: "estimate_detail" });
    assertSurfaceRead(ctx);

    const rows = await loadCatalogSystems(getPool());

    return jsonSuccess(
      {
        rows,
        total: rows.length,
      },
      ctx.manifest,
    );
  });
