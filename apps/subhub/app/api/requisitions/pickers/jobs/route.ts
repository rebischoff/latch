import { jsonSuccess, parseOffsetLimitQuery, withApiHandler } from "@latch/app-kit";

import { getPool, resolveContext } from "../../../../../lib/latch";
import { loadJobList } from "../../../../../lib/jobs/repository";
import { assertSurfaceRead } from "../../../../../lib/surfaces/assert-surface-read";

/** Job picker for the requisition header (List → New → pick job) — task 52 pin. */
export const GET = async (request: Request): Promise<Response> =>
  withApiHandler(async () => {
    const ctx = await resolveContext({ surfaceId: "requested_order_detail" });
    assertSurfaceRead(ctx);

    const parsed = parseOffsetLimitQuery(request);
    const result = await loadJobList(getPool(), {
      limit: typeof parsed?.limit === "number" ? parsed.limit : 200,
      offset: typeof parsed?.offset === "number" ? parsed.offset : 0,
      rowScope: ctx.manifest.rowScope ?? "all",
    });

    return jsonSuccess(
      {
        rows: result.rows.map((row) => ({
          id: row.id,
          title: row.title,
        })),
        total: result.total,
      },
      ctx.manifest,
    );
  });
