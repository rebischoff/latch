import { jsonSuccess, withApiHandler } from "@latch/app-kit";
import { fieldAllows, ForbiddenError } from "@latch/contracts";

import { loadOrgItemTree } from "@/lib/catalog/repository/item-picker-tree";
import { getPool, resolveContext } from "@/lib/latch";
import { assertSurfaceRead } from "@/lib/surfaces/assert-surface-read";

export const GET = async (request: Request): Promise<Response> =>
  withApiHandler(async () => {
    const ctx = await resolveContext({ surfaceId: "part_detail" });
    assertSurfaceRead(ctx);

    if (!fieldAllows(ctx.manifest, "item_links", "read")) {
      throw new ForbiddenError();
    }

    const searchQuery = new URL(request.url).searchParams.get("q")?.trim() ?? undefined;
    const tree = await loadOrgItemTree(getPool(), searchQuery);

    return jsonSuccess({ tree }, ctx.manifest);
  });
