import { jsonSuccess } from "@latch/app-kit";

import { withSubhubApiHandler } from "../../../../../lib/api-handler";
import { ensureContactsDal } from "../../../../../lib/contacts/dal";
import { resolveContextFresh } from "../../../../../lib/latch";
import { assertSurfaceRead } from "../../../../../lib/surfaces/assert-surface-read";

export const POST = async (
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> =>
  withSubhubApiHandler(async () => {
    const { id } = await context.params;
    const ctx = await resolveContextFresh({
      surfaceId: "manufacturer_detail",
      entityId: id,
    });
    assertSurfaceRead(ctx);
    const body: unknown = await request.json();
    const dal = await ensureContactsDal();
    const data = await dal.manufacturerDetail.addRole(ctx, id, body);
    return jsonSuccess(data, ctx.manifest);
  });
