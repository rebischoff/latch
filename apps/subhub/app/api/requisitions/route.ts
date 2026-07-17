import { jsonSuccess, parseOffsetLimitQuery, withApiHandler } from "@latch/app-kit";

import { withSubhubApiHandler } from "../../../lib/api-handler";
import { resolveContextFresh } from "../../../lib/latch";
import { assertSurfaceRead } from "../../../lib/surfaces/assert-surface-read";
import { loadSurfaceListQuery } from "../../../lib/surfaces/load-surface-list";
import { createListFromRegistry } from "../../../lib/surfaces/surface-loader-registry";

export const GET = async (request: Request): Promise<Response> =>
  withApiHandler(async () => {
    const url = new URL(request.url);
    const query = parseOffsetLimitQuery(request) ?? {};
    const jobId = url.searchParams.get("job_id");
    if (jobId) {
      (query as Record<string, unknown>).job_id = jobId;
    }
    const { data, manifest } = await loadSurfaceListQuery("requested_order_list", query);
    return jsonSuccess(data, manifest);
  });

export const POST = async (request: Request): Promise<Response> =>
  withSubhubApiHandler(async () => {
    const ctx = await resolveContextFresh({
      surfaceId: "requested_order_detail",
      entityId: "new",
    });
    assertSurfaceRead(ctx);
    const body: unknown = await request.json();
    const data = await createListFromRegistry("requested_order_list", ctx, body);
    return jsonSuccess(data, ctx.manifest);
  });
