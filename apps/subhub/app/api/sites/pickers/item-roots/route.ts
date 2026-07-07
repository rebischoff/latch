import { jsonSuccess, withApiHandler } from "@latch/app-kit";
import { fieldAllows, ForbiddenError } from "@latch/contracts";

import { listSiteScopePickerRoots } from "../../../../../lib/catalog/repository/item-roots";
import { getPool, resolveContext } from "../../../../../lib/latch";
import { assertSurfaceRead } from "../../../../../lib/surfaces/assert-surface-read";

export const GET = async (): Promise<Response> =>
  withApiHandler(async () => {
    const ctx = await resolveContext({ surfaceId: "site_detail" });
    assertSurfaceRead(ctx);

    const canReadScopes =
      fieldAllows(ctx.manifest, "scopes", "read") ||
      fieldAllows(ctx.manifest, "scopes", "write");

    if (!canReadScopes) {
      throw new ForbiddenError();
    }

    const rows = await listSiteScopePickerRoots(getPool());

    return jsonSuccess(
      {
        rows,
        total: rows.length,
      },
      ctx.manifest,
    );
  });
