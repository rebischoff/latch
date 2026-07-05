import { jsonSuccess, withApiHandler } from "@latch/app-kit";
import { fieldAllows, ForbiddenError, ValidationError } from "@latch/contracts";

import { loadItemTreeForRoot } from "@/lib/catalog/repository/item-tree";
import { getPool, resolveContext } from "@/lib/latch";
import { assertSurfaceRead } from "@/lib/surfaces/assert-surface-read";

export const GET = async (request: Request): Promise<Response> =>
  withApiHandler(async () => {
    const ctx = await resolveContext({ surfaceId: "estimate_detail" });
    assertSurfaceRead(ctx);

    if (!fieldAllows(ctx.manifest, "line_items", "read")) {
      throw new ForbiddenError();
    }

    const params = new URL(request.url).searchParams;
    const rootCategoryId = params.get("root_category_id")?.trim();
    if (!rootCategoryId) {
      throw new ValidationError("root_category_id is required", {
        field: "root_category_id",
        code: "required",
      });
    }

    const searchQuery = params.get("q")?.trim() ?? undefined;
    const tree = await loadItemTreeForRoot(getPool(), rootCategoryId, searchQuery);

    return jsonSuccess({ tree }, ctx.manifest);
  });
