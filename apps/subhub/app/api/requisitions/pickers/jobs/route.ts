import { jsonSuccess, parseOffsetLimitQuery, withApiHandler } from "@latch/app-kit";

import { getPool, resolveContext } from "../../../../../lib/latch";
import { loadJobList } from "../../../../../lib/jobs/repository";
import { assertSurfaceRead } from "../../../../../lib/surfaces/assert-surface-read";

/** Job picker for material-request filters (task 56). */
export const GET = async (request: Request): Promise<Response> =>
  withApiHandler(async () => {
    const ctx = await resolveContext({ surfaceId: "job_material_request_list" });
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
