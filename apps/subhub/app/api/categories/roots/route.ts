import { jsonSuccess, withApiHandler } from "@latch/app-kit";

import { listRootCategories } from "../../../../lib/catalog/repository/category-roots";
import { getPool, resolveContext } from "../../../../lib/latch";
import { assertSurfaceRead } from "../../../../lib/surfaces/assert-surface-read";

export const GET = async (): Promise<Response> =>
  withApiHandler(async () => {
    const ctx = await resolveContext({ surfaceId: "category_list" });
    assertSurfaceRead(ctx);

    const rows = await listRootCategories(getPool());

    return jsonSuccess(
      {
        rows,
        total: rows.length,
      },
      ctx.manifest,
    );
  });
