import {
  jsonSuccess,
  parseOffsetLimitQuery,
  withApiHandler,
} from "@latch/app-kit";

import { getPool, resolveContext } from "../../../../../lib/latch";
import { loadSiteList } from "../../../../../lib/sites/repository";
import { assertSurfaceRead } from "../../../../../lib/surfaces/assert-surface-read";

export const GET = async (request: Request): Promise<Response> =>
  withApiHandler(async () => {
    const ctx = await resolveContext({ surfaceId: "estimate_detail" });
    assertSurfaceRead(ctx);

    const parsed = parseOffsetLimitQuery(request);
    const result = await loadSiteList(getPool(), {
      limit: typeof parsed?.limit === "number" ? parsed.limit : 100,
      offset: typeof parsed?.offset === "number" ? parsed.offset : 0,
      rowScope: ctx.manifest.rowScope ?? "all",
    });

    return jsonSuccess(
      {
        rows: result.rows.map((row) => ({
          id: row.id,
          name: row.name,
        })),
        total: result.total,
      },
      ctx.manifest,
    );
  });
