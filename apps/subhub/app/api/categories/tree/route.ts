import { jsonSuccess, withApiHandler } from "@latch/app-kit";
import { ForbiddenError, surfaceAllows } from "@latch/contracts";

import { withSubhubApiHandler } from "../../../../lib/api-handler";
import { getPool, resolveContext } from "../../../../lib/latch";
import { assertSurfaceRead } from "../../../../lib/surfaces/assert-surface-read";
import { loadSurfaceListQuery } from "../../../../lib/surfaces/load-surface-list";
import { createListFromRegistry } from "../../../../lib/surfaces/surface-loader-registry";

const parseCategoryTreeQuery = (request: Request): Record<string, unknown> | undefined => {
  const q = new URL(request.url).searchParams.get("q");
  if (q !== null) {
    return { q };
  }
  return undefined;
};

export const GET = async (request: Request): Promise<Response> =>
  withApiHandler(async () => {
    const query = parseCategoryTreeQuery(request);
    const { data, manifest } = await loadSurfaceListQuery("category_list", query);
    return jsonSuccess(data, manifest);
  });

export const POST = async (request: Request): Promise<Response> =>
  withSubhubApiHandler(async () => {
    const ctx = await resolveContext({ surfaceId: "category_list" });
    assertSurfaceRead(ctx);
    if (!surfaceAllows(ctx.manifest, "create")) {
      throw new ForbiddenError();
    }

    const body: unknown = await request.json();
    const data = await createListFromRegistry("category_list", ctx, body);
    return jsonSuccess(data, ctx.manifest);
  });
