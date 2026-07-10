import { jsonSuccess, withApiHandler } from "@latch/app-kit";
import { fieldAllows, ForbiddenError, ValidationError } from "@latch/contracts";

import { loadSpecTemplatesForRoots } from "@/lib/estimates/repository/estimate-site-tree";
import { getPool, resolveContext } from "@/lib/latch";
import { assertSurfaceRead } from "@/lib/surfaces/assert-surface-read";

export const GET = async (request: Request): Promise<Response> =>
  withApiHandler(async () => {
    const ctx = await resolveContext({ surfaceId: "estimate_detail" });
    assertSurfaceRead(ctx);

    if (!fieldAllows(ctx.manifest, "conditions", "read")) {
      throw new ForbiddenError();
    }

    const rootItemId = new URL(request.url).searchParams.get("root_item_id")?.trim();
    if (!rootItemId) {
      throw new ValidationError("root_item_id is required", {
        field: "root_item_id",
        code: "required",
      });
    }

    const templates = await loadSpecTemplatesForRoots(getPool(), [rootItemId]);
    const specs = templates[rootItemId] ?? [];

    return jsonSuccess({ specs }, ctx.manifest);
  });
