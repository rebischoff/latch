import { jsonSuccess, parseOffsetLimitQuery, withApiHandler } from "@latch/app-kit";

import { withSubhubApiHandler } from "../../../../lib/api-handler";
import { resolveContextFresh } from "../../../../lib/latch";
import { assertSurfaceRead } from "../../../../lib/surfaces/assert-surface-read";
import { loadSurfaceListQuery } from "../../../../lib/surfaces/load-surface-list";
import { createListFromRegistry } from "../../../../lib/surfaces/surface-loader-registry";

export const GET = async (request: Request): Promise<Response> =>
  withApiHandler(async () => {
    const query = parseOffsetLimitQuery(request);
    const { data, manifest } = await loadSurfaceListQuery("user_list", query);
    return jsonSuccess(data, manifest);
  });

export const POST = async (request: Request): Promise<Response> =>
  withSubhubApiHandler(async () => {
    const ctx = await resolveContextFresh({ surfaceId: "user_list" });
    assertSurfaceRead(ctx);
    const body: unknown = await request.json();
    const data = await createListFromRegistry("user_list", ctx, body);
    return jsonSuccess(data, ctx.manifest);
  });
