import { jsonSuccess, parseOffsetLimitQuery, withApiHandler } from "@latch/app-kit";

import { withSubhubApiHandler } from "../../../lib/api-handler";
import { resolveContextFresh } from "../../../lib/latch";
import { assertSurfaceRead } from "../../../lib/surfaces/assert-surface-read";
import { loadSurfaceListQuery } from "../../../lib/surfaces/load-surface-list";
import { createListFromRegistry } from "../../../lib/surfaces/surface-loader-registry";

const parsePartListQuery = (request: Request): Record<string, unknown> | undefined => {
  const base = parseOffsetLimitQuery(request) ?? {};
  const q = new URL(request.url).searchParams.get("q");
  if (q !== null) {
    base.q = q;
  }
  return Object.keys(base).length > 0 ? base : undefined;
};

export const GET = async (request: Request): Promise<Response> =>
  withApiHandler(async () => {
    const query = parsePartListQuery(request);
    const { data, manifest } = await loadSurfaceListQuery("part_list", query);
    return jsonSuccess(data, manifest);
  });

export const POST = async (request: Request): Promise<Response> =>
  withSubhubApiHandler(async () => {
    const ctx = await resolveContextFresh({ surfaceId: "part_detail", entityId: "new" });
    assertSurfaceRead(ctx);
    const body: unknown = await request.json();
    const data = await createListFromRegistry("part_list", ctx, body);
    return jsonSuccess(data, ctx.manifest);
  });
