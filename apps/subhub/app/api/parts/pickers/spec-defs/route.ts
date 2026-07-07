import { jsonSuccess, withApiHandler } from "@latch/app-kit";
import { fieldAllows, ForbiddenError, ValidationError } from "@latch/contracts";

import { listDefsForItemIds } from "@/lib/parts/repository/part-specs";
import { getPool, resolveContext } from "@/lib/latch";
import { assertSurfaceRead } from "@/lib/surfaces/assert-surface-read";

export const GET = async (request: Request): Promise<Response> =>
  withApiHandler(async () => {
    const ctx = await resolveContext({ surfaceId: "part_detail" });
    assertSurfaceRead(ctx);

    if (!fieldAllows(ctx.manifest, "part_specs", "read")) {
      throw new ForbiddenError();
    }

    const itemIdsParam = new URL(request.url).searchParams.get("item_ids")?.trim();
    if (!itemIdsParam) {
      throw new ValidationError("item_ids is required", {
        field: "item_ids",
        code: "required",
      });
    }

    const itemIds = itemIdsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    const defs = await listDefsForItemIds(getPool(), itemIds);

    return jsonSuccess({ defs }, ctx.manifest);
  });
