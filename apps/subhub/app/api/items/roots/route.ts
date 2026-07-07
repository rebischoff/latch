import { jsonSuccess, withApiHandler } from "@latch/app-kit";

import { listRootItems } from "../../../../lib/catalog/repository/item-roots";
import { getPool, resolveContext } from "../../../../lib/latch";
import { assertSurfaceRead } from "../../../../lib/surfaces/assert-surface-read";

export const GET = async (): Promise<Response> =>
  withApiHandler(async () => {
    const ctx = await resolveContext({ surfaceId: "item_list" });
    assertSurfaceRead(ctx);

    const rows = await listRootItems(getPool());

    return jsonSuccess(
      {
        rows,
        total: rows.length,
      },
      ctx.manifest,
    );
  });
